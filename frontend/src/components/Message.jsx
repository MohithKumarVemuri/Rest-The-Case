function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Very lightweight markdown renderer (bold, italic, inline code, line breaks)
function renderMarkdown(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
  return html;
}

export default function Message({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`message ${isUser ? "user" : "assistant"} ${message.isError ? "error" : ""}`}>
      {!isUser && <div className="avatar assistant-avatar">⚖</div>}
      <div className="bubble-wrapper">
        <div
          className="bubble"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
        <div className="meta">
          <span className="timestamp">{formatTime(message.timestamp)}</span>
          {message.tokensUsed && (
            <span className="token-badge">{message.tokensUsed} tokens · {message.retrievedChunks} chunks</span>
          )}
        </div>
      </div>
      {isUser && <div className="avatar user-avatar">U</div>}
    </div>
  );
}
