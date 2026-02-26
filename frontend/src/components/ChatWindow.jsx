import { useEffect, useRef } from "react";
import Message from "./Message";

export default function ChatWindow({ messages, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="chat-window">
      <div className="messages-list">
        {messages.map((msg, i) => (
          <Message key={i} message={msg} />
        ))}
        {loading && (
          <div className="message assistant">
            <div className="avatar assistant-avatar">⚖</div>
            <div className="bubble loading-bubble">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
