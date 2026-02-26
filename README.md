# ⚖ Rest the Case — Production-Grade RAG Chat Assistant

A fully-featured **Retrieval-Augmented Generation (RAG)** chat assistant for legal services. Built with Node.js, Express, React, and OpenAI. Answers user questions using a private knowledge base — grounded responses, zero hallucination.

---

## 🏗 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              React Frontend (Vite + CSS)                     │   │
│  │   ChatWindow │ InputBar │ Sidebar (Retrieval Debug)          │   │
│  │              localStorage → sessionId                        │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │  POST /api/chat { sessionId, message }
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER (Node.js)                        │
│                                                                      │
│  ① Validate Input                                                   │
│  ② Embed Query  ──────────────────────────────► OpenAI Embeddings  │
│  ③ Similarity Search (Cosine)                                       │
│       vector_store.json ◄── compare ── queryVector                  │
│       filter score ≥ 0.5 → Top 3 chunks                            │
│  ④ Build Augmented Prompt                                           │
│       [System] + [Context Chunks] + [History] + [Question]          │
│  ⑤ Call LLM  ─────────────────────────────────► OpenAI GPT-4o-mini│
│  ⑥ Persist History (in-memory, last 4 pairs)                       │
│  ⑦ Return structured JSON response                                  │
└─────────────────────────────────────────────────────────────────────┘

PRE-PROCESSING (one-time, run ingest.js):
  docs.json → chunk (300–400 words, 50-word overlap)
            → embed each chunk (text-embedding-3-small)
            → save to vector_store.json
```

---

## 🔄 RAG Workflow Explanation

### Step 1 — Ingestion (Offline)
1. `docs.json` contains 10 documents about firm policies, fees, case types, etc.
2. `ingest.js` splits each document into overlapping chunks (~400 words, 50-word overlap).
3. Each chunk is sent to OpenAI's `text-embedding-3-small` model to produce a 1536-dimensional vector.
4. All chunks + vectors are saved to `vector_store.json`.

### Step 2 — Runtime (Per Query)
1. User sends a message → server receives `{ sessionId, message }`.
2. The user's message is embedded via the same OpenAI embeddings model.
3. Cosine similarity is computed between the query vector and every stored chunk vector.
4. Chunks with similarity ≥ 0.5 are kept; top 3 by score are selected.
5. The retrieved chunks are injected into the LLM system prompt.
6. The LLM is instructed to answer **only** from provided context.
7. Conversation history (last 4 pairs) is also included for multi-turn coherence.

---

## 📐 Embedding Strategy

| Property | Value |
|---|---|
| Model | `text-embedding-3-small` |
| Dimensions | 1536 |
| Chunk size | ~400 words |
| Overlap | 50 words |
| Similarity metric | Cosine similarity |
| Threshold | 0.5 (configurable) |
| Top-K | 3 chunks |

**Why cosine similarity?**  
Cosine similarity measures the angle between vectors, making it invariant to vector magnitude. This means a short question like "refund policy?" maps to the same semantic space as longer document chunks — making it ideal for asymmetric retrieval (short query vs. long document).

**Why overlapping chunks?**  
Without overlap, important context at chunk boundaries is lost. A 50-word overlap ensures no sentence is ever completely isolated from its surrounding context.

---

## ✍️ Prompt Design Reasoning

```
SYSTEM:
  You are a helpful and professional legal assistant for "Rest the Case" law firm.
  Answer the user's question using ONLY the context provided below.
  Do NOT make up information. If the context doesn't fully address the question, say so politely.
  
  RETRIEVED CONTEXT:
  [1] (Title, similarity: 0.821)
      <chunk content>
  [2] (Title, similarity: 0.763)
      <chunk content>
  [3] (Title, similarity: 0.702)
      <chunk content>

HISTORY:
  user: <previous message>
  assistant: <previous reply>
  ...

USER: <current question>
```

**Design decisions:**
- **Context-first grounding**: The LLM is explicitly told to use only the retrieved context. This prevents hallucination.
- **Fallback handling**: If no chunks exceed the threshold, the system prompt changes to a safe fallback message.
- **Low temperature (0.2)**: Minimizes creative deviation; the model stays factual and predictable.
- **History inclusion**: Last 4 message pairs enable follow-up questions without losing context.
- **Similarity scores in prompt**: Including scores helps the model (and developer) understand retrieval confidence.

---

## 🗂 Project Structure

```
rag-assistant/
├── backend/
│   ├── data/
│   │   ├── docs.json           # Raw knowledge base (10 documents)
│   │   └── vector_store.json   # Generated: chunks + embeddings
│   ├── scripts/
│   │   └── ingest.js           # Pre-processing: chunk → embed → store
│   ├── utils/
│   │   └── vector_math.js      # Cosine similarity, dot product, retrieval
│   ├── server.js               # Express server + RAG pipeline
│   ├── .env.example            # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx  # Message list + scroll
│   │   │   ├── Message.jsx     # Individual message bubble
│   │   │   ├── InputBar.jsx    # Text input + send button
│   │   │   └── Sidebar.jsx     # Session info + retrieval debug
│   │   ├── App.jsx             # Root component + API calls
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Full design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- An OpenAI API key

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Generate Embeddings (One-Time Setup)

```bash
cd backend
npm run ingest
# This creates data/vector_store.json
# Typically takes 30–60 seconds for 10 documents
```

### 4. Start the Backend

```bash
cd backend
npm start
# Server runs on http://localhost:3001
```

### 5. Start the Frontend

```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### 6. Open the App

Navigate to [http://localhost:5173](http://localhost:5173) and start chatting!

---

## 🔌 API Reference

### `POST /api/chat`

**Request:**
```json
{
  "sessionId": "session_abc123",
  "message": "What is the refund policy?"
}
```

**Response:**
```json
{
  "reply": "Unused retainer balances are refunded within 14 business days of case closure...",
  "tokensUsed": 312,
  "retrievedChunks": 3,
  "similarityScores": [
    { "title": "Refund and Retainer Policy", "score": 0.8412 },
    { "title": "Consultation Fees and Billing", "score": 0.7231 },
    { "title": "Case Filing Procedure", "score": 0.5812 }
  ]
}
```

**Error Responses:**
| Status | Scenario |
|---|---|
| 400 | Missing/invalid sessionId or message |
| 401 | Invalid API key |
| 429 | Rate limit reached |
| 504 | LLM request timeout |
| 500 | Internal server error |

### `DELETE /api/session/:sessionId`
Clears the conversation history for a session.

### `GET /api/health`
Returns server status and chunk count.

---

## 🧪 Sample Questions to Test

- "What are the consultation fees?"
- "How do I reset my password?" *(should trigger fallback — not in KB)*
- "What is the refund policy for retainers?"
- "Can I change my assigned attorney?"
- "What practice areas do you cover?"
- "How do I schedule an emergency consultation?"
- "What happens if I miss my appointment?"

---

## 📊 Evaluation Notes

| Area | Implementation |
|---|---|
| **RAG Architecture** | Full pipeline: ingest → embed → retrieve → augment → respond |
| **Embedding & Similarity** | OpenAI `text-embedding-3-small` + cosine similarity + 0.5 threshold |
| **LLM Integration** | GPT-4o-mini, temp=0.2, token logging, full error handling |
| **Prompt Design** | Grounded system prompt, fallback on no context, history-aware |
| **Frontend UI** | React + Vite, markdown rendering, loading states, session handling |
| **Code Quality** | Modular structure, error handling, comments, input validation |

---

*Built for the Rest the Case technical assignment. All knowledge base content is fictional and for demonstration purposes.*
