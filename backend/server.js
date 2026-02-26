require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { pipeline } = require("@xenova/transformers");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const VECTOR_STORE_PATH = path.join(__dirname, "./data/vector_store.json");

let vectorStore = [];
let embedder;

// --------------------
// Cosine Similarity
// --------------------
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --------------------
// Gemini HTTPS Call
// --------------------
async function generateWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  const body = JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2
    }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => (data += chunk));

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);

          if (parsed.error) {
            return reject(new Error(parsed.error.message));
          }

          const reply =
            parsed.candidates?.[0]?.content?.parts?.[0]?.text;

          resolve(reply || "No response generated.");
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// --------------------
// Initialize
// --------------------
async function init() {
  console.log("🔄 Loading vector store...");
  vectorStore = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, "utf-8"));

  console.log("🤖 Loading embedding model...");
  embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  console.log("✅ Server ready.");
}

// --------------------
// Health Routes
// --------------------
app.get("/", (req, res) => {
  res.send("RAG Assistant Backend Running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// --------------------
// RAG Chat Endpoint
// --------------------
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: "sessionId and message are required"
      });
    }

    // 1️⃣ Embed user query
    const queryOutput = await embedder(message, {
      pooling: "mean",
      normalize: true
    });

    const queryVector = Array.from(queryOutput.data);

    // 2️⃣ Score documents
    const scoredDocs = vectorStore.map((doc) => ({
      ...doc,
      score: cosineSimilarity(queryVector, doc.vector),
    }));

    scoredDocs.sort((a, b) => b.score - a.score);

    const topChunks = scoredDocs.slice(0, 3);
    const topScore = topChunks[0]?.score || 0;

    // 3️⃣ Threshold Guard
    if (topScore < 0.45) {
      return res.json({
        reply:
          "I do not have sufficient information in the knowledge base to answer that.",
        tokensUsed: 0,
        retrievedChunks: 0,
        similarityScores: []
      });
    }

    // 4️⃣ Build Context
    const context = topChunks.map((c) => c.content).join("\n\n");

    const prompt = `
You are a legal assistant for a law firm.

Answer strictly using the provided context.
If the answer is not clearly found in the context, say you do not know.

Context:
${context}

User Question:
${message}
`;

    // 5️⃣ Generate response
    const reply = await generateWithGemini(prompt);

    // 6️⃣ Send response
    res.json({
      reply,
      tokensUsed: 0,
      retrievedChunks: topChunks.length,
      similarityScores: topChunks.map(c => c.score)
    });

  } catch (error) {
    console.error("FULL ERROR:", error.message);

    res.status(500).json({
      error: error.message
    });
  }
});

// --------------------
// Start Server
// --------------------
init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});