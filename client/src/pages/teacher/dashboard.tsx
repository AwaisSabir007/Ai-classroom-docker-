import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Users, BookOpen, Video, BarChart3, Play, Clock, TrendingUp,
  AlertCircle, Brain, Zap, ChevronRight, Plus, Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

const attentionData = [
  { day: "Mon", attention: 74 }, { day: "Tue", attention: 82 }, { day: "Wed", attention: 69 },
  { day: "Thu", attention: 88 }, { day: "Fri", attention: 76 }, { day: "Sat", attention: 71 },
  { day: "Sun", attention: 84 },
];

const emotionData = [
  { name: "Focused", value: 42, color: "#16A34A" },
  { name: "Neutral", value: 28, color: "#2563EB" },
  { name: "Confused", value: 15, color: "#D97706" },
  { name: "Bored", value: 10, color: "#DC2626" },
  { name: "Happy", value: 5, color: "#7C3AED" },
];

function AttentionBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-700 border-0">{score}%</Badge>;
  if (score >= 65) return <Badge className="bg-amber-100 text-amber-700 border-0">{score}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-0">{score}%</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") return <Badge className="bg-red-50 text-red-600 border-0 animate-pulse">Live</Badge>;
  if (status === "ended") return <Badge className="bg-muted text-muted-foreground border-0">Ended</Badge>;
  return <Badge className="bg-blue-50 text-blue-600 border-0">Scheduled</Badge>;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({ queryKey: ["/api/classes"] });
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<any[]>({ queryKey: ["/api/sessions"] });

  const startSession = useMutation({
    mutationFn: ({ classId, title }: { classId: string; title: string }) =>
      apiRequest("POST", "/api/sessions", { classId, title }),
    onSuccess: (session: any) => {
      qc.invalidateQueries({ queryKey: ["/api/sessions"] });
      setLocation(`/teacher/session/${session.id}`);
    },
  });

  const totalStudents = classes.reduce((sum: number, c: any) => sum + (c.studentCount || 0), 0);
  const recentSessions = sessions.slice(0, 5);
  const liveSession = sessions.find((s: any) => s.status === "live");

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] || "Teacher"}`}
        subtitle="Here's what's happening in your classes today"
        actions={
          <Button
            size="sm"
            className="bg-[#2563EB] text-white"
            onClick={() => classes[0] && startSession.mutate({ classId: classes[0].id, title: "Live Session" })}
            disabled={startSession.isPending || classes.length === 0}
            data-testid="button-start-session"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Start Session
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={totalStudents}
            subtitle={`Across ${classes.length} classes`}
            icon={Users}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            trend={{ value: 12, label: "this month" }}
          />
          <StatCard
            title="Active Classes"
            value={classes.length}
            subtitle="All classes active"
            icon={BookOpen}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
          <StatCard
            title="Sessions Run"
            value={sessions.length}
            subtitle="Total sessions"
            icon={Video}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            trend={{ value: 8, label: "vs last week" }}
          />
          <StatCard
            title="Avg. Attention"
            value="78%"
            subtitle="Across all sessions"
            icon={Brain}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            trend={{ value: 5, label: "vs last week" }}
          />
        </div>

        {/* Live Session Banner */}
        {liveSession && (
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <div>
                <p className="text-white font-semibold text-sm">Live Session in Progress</p>
                <p className="text-red-100 text-xs">{liveSession.title}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/30 text-white"
              onClick={() => setLocation(`/teacher/session/${liveSession.id}`)}
              data-testid="button-rejoin-session"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              View Session
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Attention Trend */}
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-sm font-semibold">Weekly Attention Trend</CardTitle>
              <Badge variant="outline" className="text-xs">Last 7 days</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={attentionData}>
                  <defs>
                    <linearGradient id="attentionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[50, 100]} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #BFDBFE" }}
                    formatter={(val: number) => [`${val}%`, "Avg Attention"]}
                  />
                  <Area type="monotone" dataKey="attention" stroke="#2563EB" strokeWidth={2} fill="url(#attentionGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Emotion Distribution */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Emotion Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {emotionData.map(e => (
                <div key={e.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{e.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{e.value}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${e.value}%`, background: e.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* My Classes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-sm font-semibold">My Classes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/teacher/classes")} data-testid="link-view-classes">
                View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {classesLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              ) : classes.length === 0 ? (
                <div className="py-8 text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No classes yet</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setLocation("/teacher/classes")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create Class
                  </Button>
                </div>
              ) : (
                classes.slice(0, 4).map((cls: any) => (
                  <div
                    key={cls.id}
                    data-testid={`class-card-${cls.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 cursor-pointer hover-elevate"
                    onClick={() => setLocation(`/teacher/classes/${cls.id}`)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{cls.title}</p>
                      <p className="text-xs text-muted-foreground">{cls.studentCount || 0} students · {cls.subject}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{cls.joinCode}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-sm font-semibold">Recent Sessions</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/teacher/analytics")} data-testid="link-view-analytics">
                Analytics <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessionsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              ) : recentSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                </div>
              ) : (
                recentSessions.map((s: any) => (
                  <div
                    key={s.id}
                    data-testid={`session-item-${s.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 cursor-pointer hover-elevate"
                    onClick={() => setLocation(`/teacher/session/${s.id}`)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Video className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.title || "Live Session"}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.startedAt ? formatDistanceToNow(new Date(s.startedAt), { addSuffix: true }) : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.avgAttention && <AttentionBadge score={Math.round(s.avgAttention)} />}
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Plus, label: "Create Class", sub: "New class", action: () => setLocation("/teacher/classes"), color: "bg-blue-50 text-blue-600", testId: "action-create-class" },
              { icon: Play, label: "Start Session", sub: "Go live now", action: () => classes[0] && startSession.mutate({ classId: classes[0].id, title: "Live Session" }), color: "bg-red-50 text-red-600", testId: "action-start-session" },
              { icon: BookOpen, label: "Upload Book", sub: "Add material", action: () => setLocation("/teacher/books"), color: "bg-purple-50 text-purple-600", testId: "action-upload-book" },
              { icon: BarChart3, label: "View Analytics", sub: "Performance", action: () => setLocation("/teacher/analytics"), color: "bg-amber-50 text-amber-600", testId: "action-view-analytics" },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                data-testid={item.testId}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-muted/40 cursor-pointer hover-elevate text-center"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
