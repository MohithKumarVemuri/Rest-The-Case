export default function Sidebar({ open, onClose, onNewChat, sessionId, retrievalInfo }) {
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">⚖ Rest the Case</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="sidebar-section">
          <h3>Session</h3>
          <div className="session-id">{sessionId}</div>
          <button className="sidebar-action-btn" onClick={() => { onNewChat(); onClose(); }}>
            + Start New Chat
          </button>
        </div>

        {retrievalInfo && (
          <div className="sidebar-section">
            <h3>Last Retrieval</h3>
            <div className="retrieval-stat">
              <span>Chunks retrieved</span>
              <strong>{retrievalInfo.retrievedChunks}</strong>
            </div>
            <div className="retrieval-stat">
              <span>Tokens used</span>
              <strong>{retrievalInfo.tokensUsed ?? "—"}</strong>
            </div>
            {retrievalInfo.similarityScores?.length > 0 && (
              <div className="score-list">
                <p className="score-label">Similarity Scores</p>
               {retrievalInfo?.similarityScores?.map((s, i) => (
  <div key={i} className="score-row">
    <span className="score-title">Chunk {i + 1}</span>
    <div className="score-bar-wrap">
      <div
        className="score-bar"
        style={{ width: `${s * 100}%` }}
      />
    </div>
    <span className="score-val">{s.toFixed(3)}</span>
  </div>
))}
              </div>
            )}
          </div>
        )}

        <div className="sidebar-section">
          <h3>About</h3>
          <p className="sidebar-about">
            This assistant uses <strong>RAG</strong> (Retrieval-Augmented Generation)
            to answer questions from Rest the Case's knowledge base.
            Responses are grounded — no hallucination.
          </p>
        </div>
      </aside>
    </>
  );
}
