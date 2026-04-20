import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Send, User, ChevronLeft, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function StudentTutor() {
  const { id: classId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I am the EduSense AI Tutor for this class. I have read all of your teacher's past lecture transcripts. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Fetch class details
  const { data: cls, isLoading: classLoading } = useQuery<any>({
    queryKey: [`/api/classes/${classId}`],
  });

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      // Exclude the very first greeting or system prompts to save tokens if needed, but history is good for context
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
      
      const res = await apiRequest("POST", `/api/classes/${classId}/tutor/chat`, {
        message: userMessage,
        history
      });
      return res;
    },
    onMutate: (userMessage) => {
      setMessages(prev => [...prev, { role: "user", content: userMessage }]);
      setInput("");
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: (err) => {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message || "Failed to reach tutor."}` }]);
    }
  });

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input.trim());
  };

  if (classLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4 text-center mt-12">
        <Skeleton className="w-16 h-16 rounded-full mx-auto" />
        <h2 className="text-xl font-bold">Loading AI Tutor...</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto p-4 md:p-6 pb-2">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/student")} className="shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Tutor: {cls?.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" /> Answers restricted strictly to your teacher's lectures.
          </p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-blue-100 shadow-lg shadow-blue-900/5">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50">
          
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex flex-col max-w-[85%]", msg.role === "user" ? "ml-auto" : "mr-auto")}>
              <div className={cn(
                "flex items-start gap-3",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-blue-600 text-white"
                )}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={cn(
                  "p-4 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : "bg-white border text-slate-800 rounded-tl-sm prose prose-sm max-w-none"
                )}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex items-start gap-3 mr-auto max-w-[80%]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm bg-blue-600 text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white border text-slate-500 rounded-tl-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={endOfMessagesRef} />
        </div>

        <div className="p-4 bg-white border-t">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about the lectures..."
                className="pr-12 h-14 rounded-full border-slate-300 focus-visible:ring-blue-500 text-base"
                disabled={chatMutation.isPending}
              />
            </div>
            <Button 
              type="submit" 
              size="icon" 
              className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shrink-0 shadow-md transition-transform active:scale-95"
              disabled={!input.trim() || chatMutation.isPending}
            >
              <Send className="w-5 h-5 ml-1" />
            </Button>
          </form>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" /> 
            This session is not saved. Refreshing the page will clear the chat history.
          </div>
        </div>
      </Card>
    </div>
  );
}
