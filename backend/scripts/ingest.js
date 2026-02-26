require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pipeline } = require("@xenova/transformers");

const DOCS_PATH = path.join(__dirname, "../data/docs.json");
const VECTOR_STORE_PATH = path.join(__dirname, "../data/vector_store.json");

const CHUNK_SIZE = 400;
const OVERLAP_SIZE = 50;

async function loadEmbedder() {
  console.log("🤖 Loading local embedding model...");
  return await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = OVERLAP_SIZE) {
  const words = text.split(/\s+/);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start += chunkSize - overlap;
  }

  return chunks;
}

async function ingest() {
  console.log("📄 Loading documents...");
  const docs = JSON.parse(fs.readFileSync(DOCS_PATH, "utf-8"));
  console.log(`   Found ${docs.length} documents.`);

  const embedder = await loadEmbedder();
  const vectorStore = [];

  for (const doc of docs) {
    console.log(`\n🔪 Chunking document: "${doc.title}"`);
    const chunks = chunkText(doc.content);
    console.log(`   → ${chunks.length} chunk(s)`);

    for (let i = 0; i < chunks.length; i++) {
      console.log(`   🔗 Embedding chunk ${i + 1}/${chunks.length}...`);

      const output = await embedder(chunks[i], {
        pooling: "mean",
        normalize: true,
      });

      vectorStore.push({
        id: `${doc.id}-chunk-${i}`,
        docId: doc.id,
        title: doc.title,
        chunkIndex: i,
        content: chunks[i],
        vector: Array.from(output.data),
      });
    }
  }

  fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(vectorStore, null, 2));
  console.log("✅ Ingestion complete with local embeddings!");
}

ingest().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});