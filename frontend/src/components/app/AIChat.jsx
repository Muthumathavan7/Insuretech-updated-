import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AIChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "Hi! I'm Aura, your insurance assistant. How can I help today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(null);
  const endRef = useRef(null);

  if (!sessionId.current) {
    sessionId.current =
      localStorage.getItem("tp_chat_session") ||
      `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("tp_chat_session", sessionId.current);
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  if (!user) return null;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const r = await api.post("/ai/chat", {
        session_id: sessionId.current,
        message: userMsg.content,
      });
      setMsgs((m) => [...m, { role: "assistant", content: r.data.reply }]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Sorry — I couldn't reach the AI right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        data-testid="ai-chat-toggle"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float flex items-center justify-center transition-transform hover:scale-105"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div
          data-testid="ai-chat-panel"
          className="fixed bottom-24 left-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in-up"
        >
          <div className="p-4 bg-gradient-to-br from-primary-50 to-white border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold font-display">Aura</div>
              <div className="text-xs text-gray-500">AI insurance assistant</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  data-testid={`chat-msg-${m.role}`}
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-gray-100 text-gray-900 rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3.5 py-2.5 rounded-2xl text-sm text-gray-500">
                  Aura is typing...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-3 border-t border-gray-100 flex items-center gap-2"
          >
            <input
              data-testid="ai-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            />
            <button
              data-testid="ai-chat-send"
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full bg-primary hover:bg-primary-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
