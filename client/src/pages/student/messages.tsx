import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Plus, ArrowLeft, Search, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function StudentMessages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [classmateSearch, setClassmateSearch] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: convsLoading } = useQuery<any[]>({
    queryKey: ["/api/messages/conversations"],
  });

  const { data: classmates } = useQuery<any[]>({
    queryKey: ["/api/classmates"],
  });

  const { data: threadMessages, isLoading: threadLoading } = useQuery<any[]>({
    queryKey: ["/api/messages", selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 5000,
  });

  const sendMsg = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/messages/${selectedUserId}`, { content }),
    onSuccess: () => {
      setMessageText("");
      qc.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      qc.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err?.message || "Failed to send", variant: "destructive" }),
  });

  useEffect(() => {
    if (selectedUserId) {
      apiRequest("PATCH", `/api/messages/${selectedUserId}/read`).then(() => {
        qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
        qc.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      });
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (threadMessages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages]);

  const selectedUser = conversations?.find((c: any) => c.user.id === selectedUserId)?.user
    || classmates?.find((c: any) => c.id === selectedUserId);

  function handleSelectConversation(userId: string) {
    setSelectedUserId(userId);
    setMobileShowThread(true);
  }

  function handleStartNewConversation(classmateId: string) {
    setSelectedUserId(classmateId);
    setMobileShowThread(true);
    setNewMsgOpen(false);
    setClassmateSearch("");
  }

  function handleSend() {
    if (!messageText.trim() || !selectedUserId) return;
    sendMsg.mutate(messageText.trim());
  }

  const filteredClassmates = (classmates || []).filter((c: any) => {
    if (c.id === user?.id) return false;
    if (!classmateSearch) return true;
    return c.name.toLowerCase().includes(classmateSearch.toLowerCase());
  });

  const convList = conversations || [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Messages"
        subtitle="Chat with your classmates"
        actions={
          <Button size="sm" variant="outline" onClick={() => setNewMsgOpen(true)} data-testid="button-new-message">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Message
          </Button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-border flex flex-col flex-shrink-0",
            mobileShowThread ? "hidden md:flex" : "flex"
          )}
        >
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-9 text-sm"
                data-testid="input-search-conversations"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {convsLoading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-md" />
                ))}
              </div>
            ) : convList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1" data-testid="text-no-conversations">No conversations yet</p>
                <p className="text-xs text-muted-foreground mb-4">Start a conversation with a classmate</p>
                <Button size="sm" variant="outline" onClick={() => setNewMsgOpen(true)} data-testid="button-start-conversation">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Message a Classmate
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {convList.map((conv: any) => (
                  <button
                    key={conv.user.id}
                    onClick={() => handleSelectConversation(conv.user.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors hover-elevate",
                      selectedUserId === conv.user.id && "bg-muted"
                    )}
                    data-testid={`conversation-item-${conv.user.id}`}
                  >
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {getInitials(conv.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate" data-testid={`text-conv-name-${conv.user.id}`}>
                          {conv.user.name}
                        </span>
                        {conv.lastMessage?.createdAt && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground truncate" data-testid={`text-conv-preview-${conv.user.id}`}>
                          {conv.lastMessage?.content || "No messages yet"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="text-[10px] min-w-[18px] h-[18px] flex items-center justify-center" data-testid={`badge-unread-${conv.user.id}`}>
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div
          className={cn(
            "flex-1 flex flex-col",
            !mobileShowThread ? "hidden md:flex" : "flex"
          )}
        >
          {!selectedUserId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1" data-testid="text-select-conversation">Select a conversation</p>
              <p className="text-xs text-muted-foreground">Choose a conversation from the left or start a new one</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="md:hidden"
                  onClick={() => setMobileShowThread(false)}
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {selectedUser ? getInitials(selectedUser.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" data-testid="text-thread-name">
                    {selectedUser?.name || "Classmate"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Classmate</p>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                {threadLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className={cn("h-10 rounded-md", i % 2 === 0 ? "w-2/3" : "w-1/2 ml-auto")} />
                    ))}
                  </div>
                ) : !threadMessages || threadMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-xs text-muted-foreground" data-testid="text-no-messages">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threadMessages.map((msg: any) => {
                      const isMine = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex", isMine ? "justify-end" : "justify-start")}
                          data-testid={`message-bubble-${msg.id}`}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] px-3 py-2 rounded-md text-sm",
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            )}
                          >
                            <p className="break-words">{msg.content}</p>
                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}
                            >
                              {msg.createdAt && formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-3 border-t border-border flex-shrink-0">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    data-testid="input-message"
                  />
                  <Button
                    size="icon"
                    type="submit"
                    disabled={!messageText.trim() || sendMsg.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search classmates..."
                value={classmateSearch}
                onChange={(e) => setClassmateSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-classmates"
              />
            </div>
            <ScrollArea className="max-h-64">
              {filteredClassmates.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground" data-testid="text-no-classmates">
                    {classmates && classmates.length > 0
                      ? "No classmates match your search"
                      : "No classmates found. Join a class to find classmates."}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredClassmates.map((cm: any) => (
                    <button
                      key={cm.id}
                      onClick={() => handleStartNewConversation(cm.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-md text-left hover-elevate"
                      data-testid={`classmate-item-${cm.id}`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {getInitials(cm.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{cm.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{cm.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
