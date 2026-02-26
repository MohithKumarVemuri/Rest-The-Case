import { useState, useEffect, useRef } from "react";
import ChatWindow from "./components/ChatWindow";
import InputBar from "./components/InputBar";
import Sidebar from "./components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

function generateSessionId() {
  return "session_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
}

export default function App() {
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem("rag_sessionId") || generateSessionId();
  });
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm the Rest the Case legal assistant. I can answer questions about our services, fees, policies, and procedures. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [retrievalInfo, setRetrievalInfo] = useState(null);

  useEffect(() => {
    localStorage.setItem("rag_sessionId", sessionId);
  }, [sessionId]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setError(null);
    setRetrievalInfo(null);

    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Server error");
      }

      const assistantMsg = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toISOString(),
        tokensUsed: data.tokensUsed,
        retrievedChunks: data.retrievedChunks,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setRetrievalInfo({
        retrievedChunks: data.retrievedChunks,
        similarityScores: data.similarityScores,
        tokensUsed: data.tokensUsed,
      });
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    // Clear session on backend
    try {
      await fetch(`${API_BASE}/api/session/${sessionId}`, { method: "DELETE" });
    } catch (_) {}

    const newId = generateSessionId();
    setSessionId(newId);
    localStorage.setItem("rag_sessionId", newId);
    setMessages([
      {
        role: "assistant",
        content:
          "Hello! I'm the Rest the Case legal assistant. I can answer questions about our services, fees, policies, and procedures. How can I help you today?",
        timestamp: new Date().toISOString(),
      },
    ]);
    setRetrievalInfo(null);
    setError(null);
  };

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={startNewChat}
        sessionId={sessionId}
        retrievalInfo={retrievalInfo}
      />

      <div className="main-panel">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen((s) => !s)} aria-label="Toggle sidebar">
            <span />
            <span />
            <span />
          </button>
          <div className="brand">
            <div className="brand-icon">⚖</div>
            <div>
              <h1>Rest the Case</h1>
              <p>Legal AI Assistant</p>
            </div>
          </div>
          <button className="new-chat-btn" onClick={startNewChat}>
            + New Chat
          </button>
        </header>

        <ChatWindow messages={messages} loading={loading} />
        <InputBar onSend={sendMessage} loading={loading} />
      </div>
    </div>
  );
}
