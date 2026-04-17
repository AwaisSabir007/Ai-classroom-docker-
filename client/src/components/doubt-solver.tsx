import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircleQuestion, Send, X, Sparkles, Bot, User, Trash2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function renderFormattedText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, pi) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pi}>{part.slice(2, -2)}</strong>;
      }
      return <span key={pi}>{part}</span>;
    });
    return (
      <span key={li}>
        {li > 0 && <br />}
        {rendered}
      </span>
    );
  });
}

interface DoubtSolverProps {
  bookTitle?: string;
  bookSubject?: string;
  pageContent?: string;
}

export function DoubtSolver({ bookTitle, bookSubject, pageContent }: DoubtSolverProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || streaming) return;

    setInput("");
    const userMsg: ChatMessage = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const resp = await fetch("/api/doubt-solver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortRef.current.signal,
        body: JSON.stringify({
          question,
          bookTitle,
          bookSubject,
          pageContent,
          chatHistory: messages,
        }),
      });

      if (!resp.ok) throw new Error("Failed to get response");

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: last.content + event.content };
                }
                return updated;
              });
            }
            if (event.error) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: "Sorry, I couldn't process that question right now. Please try again." };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === "assistant" && !updated[updated.length - 1].content) {
            updated[updated.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
          }
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, bookTitle, bookSubject, pageContent, messages]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    if (streaming) {
      abortRef.current?.abort();
      setStreaming(false);
    }
    setMessages([]);
  }

  const suggestedQuestions = [
    "Can you explain this concept simply?",
    "What are the key takeaways?",
    "Can you give me an example?",
    "Why is this important?",
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#2563EB] text-white shadow-lg hover:bg-[#2563EB]/90 flex items-center justify-center transition-transform hover:scale-105"
        data-testid="button-open-doubt-solver"
      >
        <MessageCircleQuestion className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[70vh] flex flex-col bg-white rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-4" data-testid="doubt-solver-panel">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1E3A5F] text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="font-semibold text-sm">AI Doubt Solver</span>
          {bookTitle && (
            <Badge className="bg-white/20 text-white text-[9px] px-1.5 border-0 font-normal truncate max-w-[120px]">
              {bookTitle}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clearChat} className="p-1 hover:bg-white/20 rounded" data-testid="button-clear-chat">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded" data-testid="button-close-doubt-solver">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3 min-h-[200px] max-h-[50vh]">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6 text-[#2563EB]" />
            </div>
            <p className="text-sm font-medium mb-1">Ask me anything!</p>
            <p className="text-xs text-muted-foreground mb-4">
              I can help you understand what you're reading
            </p>
            <div className="space-y-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground"
                  data-testid={`button-suggested-${i}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#2563EB]" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm max-w-[80%]",
                  msg.role === "user"
                    ? "bg-[#2563EB] text-white rounded-br-md leading-relaxed"
                    : "bg-muted/60 text-foreground rounded-bl-md leading-[1.7]"
                )}
                data-testid={`chat-message-${msg.role}-${i}`}
              >
                {msg.content ? (
                  msg.role === "assistant" ? renderFormattedText(msg.content) : msg.content
                ) : (streaming && i === messages.length - 1 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : null)}
                {msg.role === "user" && (
                  <div className="flex justify-end -mr-1 -mb-0.5 mt-0.5">
                    <User className="w-3 h-3 opacity-50" />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={1}
            className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 min-h-[36px] max-h-[100px]"
            disabled={streaming}
            data-testid="input-doubt-question"
          />
          <Button
            size="sm"
            className="bg-[#2563EB] hover:bg-[#2563EB]/90 rounded-xl h-9 w-9 p-0 flex-shrink-0"
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            data-testid="button-send-question"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
