import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

import { AlertTriangle, ShieldAlert } from "lucide-react";

const notifIcons: Record<string, string> = {
  class_starting: "bg-blue-100 text-blue-600",
  badge_earned: "bg-amber-100 text-amber-600",
  assignment_due: "bg-orange-100 text-orange-600",
  session_alert: "bg-red-100 text-red-600",
  report_ready: "bg-purple-100 text-purple-600",
  enrolled: "bg-emerald-100 text-emerald-600",
  plagiarism_alert: "bg-red-100 text-red-700",
  quiz_available: "bg-green-100 text-green-600",
  announcement: "bg-indigo-100 text-indigo-600",
};

export function NotificationBell() {
  const qc = useQueryClient();
  const { data: notifications = [] } = useQuery<any[]>({ queryKey: ["/api/notifications"] });
  const unread = notifications.filter((n: any) => !n.read).length;

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[380px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No notifications yet</div>
          ) : (
            <div className="divide-y">
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  data-testid={`notification-${n.id}`}
                  className={cn("flex gap-3 px-4 py-3", !n.read && "bg-blue-50/50")}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0", notifIcons[n.type] || "bg-muted")}>
                    {n.type === "plagiarism_alert" ? <ShieldAlert className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold", n.type === "plagiarism_alert" ? "text-red-700" : "text-foreground")}>{n.title}</p>
                    {n.type === "plagiarism_alert" ? (
                      <div className="text-xs mt-1 space-y-1">
                        {n.body.split("\n").filter((line: string) => line.trim()).map((line: string, li: number) => {
                          if (line.startsWith('"') && line.endsWith('"')) {
                            return <div key={li} className="p-1.5 rounded bg-red-50 border border-red-100 text-red-700 italic text-[11px] leading-relaxed">{line}</div>;
                          }
                          if (line.includes("high-risk") || line.includes("medium-risk") || line.includes("low-risk")) {
                            return <p key={li} className="text-red-600 font-medium mt-1">{line}</p>;
                          }
                          return <p key={li} className="text-muted-foreground leading-relaxed">{line}</p>;
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
