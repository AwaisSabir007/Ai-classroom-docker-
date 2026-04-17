import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Users, BookOpen, Video, TrendingUp, Building, GraduationCap, FileText, ClipboardCheck, Trophy, Activity, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSessions: number;
  totalSubmissions: number;
  totalQuizAttempts: number;
  avgAttention: number;
  topStudents: { id: string; name: string; xp: number; level: number }[];
  recentActivity: { type: string; title: string; body: string; createdAt: string | null }[];
}

function AnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [classId, setClassId] = useState("");
  const { toast } = useToast();

  const { data: allClasses = [] } = useQuery<any[]>({ queryKey: ["/api/classes"] });

  const sendAnnouncement = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/announcements", {
        title,
        body,
        target: classId ? "all" : target,
        classId: classId || undefined,
      }),
    onSuccess: (data: any) => {
      toast({
        title: "Announcement Sent",
        description: `Notification sent to ${data.notifiedCount} user${data.notifiedCount !== 1 ? "s" : ""}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setTitle("");
      setBody("");
      setTarget("all");
      setClassId("");
      setOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Send",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const isClassTarget = target === "class";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-send-announcement">
          <Megaphone className="w-4 h-4 mr-2" />
          Send Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Announcement</DialogTitle>
          <DialogDescription>Broadcast a notification to selected users.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              data-testid="input-announcement-title"
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea
              id="ann-body"
              data-testid="input-announcement-body"
              placeholder="Write your announcement message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select
              value={target}
              onValueChange={(val) => {
                setTarget(val);
                if (val !== "class") setClassId("");
              }}
            >
              <SelectTrigger data-testid="select-announcement-target">
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="students">All Students</SelectItem>
                <SelectItem value="teachers">All Teachers</SelectItem>
                <SelectItem value="class">Specific Class</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isClassTarget && (
            <div className="space-y-2">
              <Label>Select Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger data-testid="select-announcement-class">
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {allClasses.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.title} — {cls.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="button-cancel-announcement"
          >
            Cancel
          </Button>
          <Button
            onClick={() => sendAnnouncement.mutate()}
            disabled={!title.trim() || !body.trim() || (isClassTarget && !classId) || sendAnnouncement.isPending}
            data-testid="button-confirm-announcement"
          >
            {sendAnnouncement.isPending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });

  return (
    <div>
      <PageHeader
        title="Administration Dashboard"
        subtitle="Institution-wide overview and management"
        actions={<AnnouncementDialog />}
      />

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Students"
                value={stats?.totalStudents ?? 0}
                subtitle="Total enrolled"
                icon={GraduationCap}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
              />
              <StatCard
                title="Teachers"
                value={stats?.totalTeachers ?? 0}
                subtitle="Active instructors"
                icon={Users}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-50"
              />
              <StatCard
                title="Classes"
                value={stats?.totalClasses ?? 0}
                subtitle="Total classes"
                icon={BookOpen}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
              />
              <StatCard
                title="Sessions"
                value={stats?.totalSessions ?? 0}
                subtitle="Total sessions"
                icon={Video}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
              />
              <StatCard
                title="Submissions"
                value={stats?.totalSubmissions ?? 0}
                subtitle="Assignment submissions"
                icon={FileText}
                iconColor="text-cyan-600"
                iconBg="bg-cyan-50"
              />
              <StatCard
                title="Quiz Attempts"
                value={stats?.totalQuizAttempts ?? 0}
                subtitle="Total attempts"
                icon={ClipboardCheck}
                iconColor="text-rose-600"
                iconBg="bg-rose-50"
              />
              <StatCard
                title="Avg. Attention"
                value={`${stats?.avgAttention ?? 0}%`}
                subtitle="Institution-wide"
                icon={TrendingUp}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
              />
              <StatCard
                title="Platform Status"
                value="Active"
                subtitle="All systems normal"
                icon={Shield}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-sm font-semibold">Top Students by XP</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : !stats?.topStudents?.length ? (
                <div className="p-8 text-center">
                  <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No students yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {stats.topStudents.map((student, idx) => (
                    <div key={student.id} data-testid={`top-student-${student.id}`} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                        {idx + 1}
                      </div>
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="text-xs">{getInitials(student.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground">Level {student.level}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge variant="secondary" className="font-mono text-xs">{student.xp} XP</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : !stats?.recentActivity?.length ? (
                <div className="p-8 text-center">
                  <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                <div className="divide-y">
                  {stats.recentActivity.map((activity, idx) => (
                    <div key={idx} data-testid={`activity-${idx}`} className="flex items-start gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{activity.body}</p>
                        {activity.createdAt && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F] flex items-center justify-center">
                <Building className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">University Platform</h3>
                <p className="text-sm text-muted-foreground">EduSense AI · Production</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-700 font-medium">All systems operational</span>
                  </div>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs text-muted-foreground">v1.0.0</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
