import { useState, useRef, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send, Sparkles, Bot, User, Trash2, Brain,
  TrendingUp, Users, AlertTriangle, Lightbulb,
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

const quickPrompts = [
  { icon: TrendingUp, label: "Overall Performance", prompt: "Give me an overview of how my classes are performing. Which classes need the most attention?" },
  { icon: Users, label: "Students at Risk", prompt: "Which students are falling behind or at risk of disengagement? What should I do to help them?" },
  { icon: AlertTriangle, label: "Attention Issues", prompt: "Analyze the attention scores and boredom events across my classes. What patterns do you see and how can I improve engagement?" },
  { icon: Lightbulb, label: "Teaching Tips", prompt: "Based on the data, what are 3 specific strategies I should implement this week to improve student outcomes?" },
  { icon: Brain, label: "Learning Styles", prompt: "Look at my students' learning styles. How should I adapt my teaching approach for each class?" },
  { icon: Sparkles, label: "XP & Gamification", prompt: "How effective is the gamification system in my classes? Which students are engaging with it and who isn't?" },
];

export default function TeacherAIAdvisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendMessage = useCallback(async (messageText?: string) => {
    const question = (messageText || input).trim();
    if (!question || streaming) return;

    if (!messageText) setInput("");
    const userMsg: ChatMessage = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const resp = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortRef.current.signal,
        body: JSON.stringify({
          question,
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
                updated[updated.length - 1] = { role: "assistant", content: "Sorry, I couldn't process that right now. Please try again." };
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
  }, [input, streaming, messages]);

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
      <PageHeader
        title="AI Advisor"
        subtitle="Get data-driven insights about your classes and students"
        actions={
          messages.length > 0 ? (
            <Button variant="outline" size="sm" onClick={clearChat} data-testid="button-clear-advisor">
              <Trash2 className="w-4 h-4 mr-1" /> New Chat
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <>
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Sparkles className="w-8 h-8 text-amber-300" />
                </div>
                <h2 className="text-xl font-bold mb-1" data-testid="text-advisor-title">AI Teaching Advisor</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  I have access to your real class data — student performance, attention scores, XP levels, and more. Ask me anything about how to improve your teaching.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(qp.prompt)}
                    disabled={streaming}
                    className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:shadow-md hover:border-[#2563EB]/30 transition-all text-left group"
                    data-testid={`button-quick-prompt-${i}`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                      <qp.icon className="w-4.5 h-4.5 text-[#2563EB]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-0.5">{qp.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{qp.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")} data-testid={`advisor-message-${i}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm max-w-[85%]",
                    msg.role === "user"
                      ? "bg-[#2563EB] text-white rounded-br-md leading-relaxed"
                      : "bg-white border shadow-sm text-foreground rounded-bl-md leading-[1.75]"
                  )}
                  data-testid={`advisor-chat-${msg.role}-${i}`}
                >
                  {msg.content ? (
                    msg.role === "assistant" ? renderFormattedText(msg.content) : msg.content
                  ) : (streaming && i === messages.length - 1 ? (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#2563EB]/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#2563EB]/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#2563EB]/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-muted-foreground">Analyzing your data...</span>
                    </div>
                  ) : null)}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-[#1E3A5F] flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t bg-white p-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your classes, students, or teaching strategies..."
              rows={1}
              className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 min-h-[48px] max-h-[120px] pr-12"
              disabled={streaming}
              data-testid="input-advisor-question"
            />
          </div>
          <Button
            className="bg-[#2563EB] hover:bg-[#2563EB]/90 rounded-xl h-12 w-12 p-0 flex-shrink-0"
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            data-testid="button-send-advisor"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
