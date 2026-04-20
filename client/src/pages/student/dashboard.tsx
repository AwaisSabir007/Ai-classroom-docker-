import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Zap, Flame, Trophy, Clock, ChevronRight, Users,
  Play, Star, Brain, CheckCircle, Plus, ClipboardCheck, Shield, Radio, Wifi, Bot,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { AssignmentSubmit } from "@/components/assignment-submit";
import { cn } from "@/lib/utils";

const xpThresholds = [0, 100, 250, 500, 900, 1400, 2000, 2700, 3500, 4400, 5500];

function getLevelProgress(xp: number, level: number) {
  const current = xpThresholds[level - 1] || 0;
  const next = xpThresholds[level] || xpThresholds[level - 1] + 1000;
  const progress = ((xp - current) / (next - current)) * 100;
  return { progress: Math.min(100, Math.max(0, progress)), needed: next - xp };
}

const learningStyleColors: Record<string, { bg: string; text: string; label: string }> = {
  visual: { bg: "bg-blue-100", text: "text-blue-700", label: "Visual Learner" },
  auditory: { bg: "bg-amber-100", text: "text-amber-700", label: "Auditory Learner" },
  reading: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Reading/Writing Learner" },
  kinetic: { bg: "bg-purple-100", text: "text-purple-700", label: "Kinetic Learner" },
  mixed: { bg: "bg-slate-100", text: "text-slate-600", label: "Mixed Style" },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rawClasses, isLoading: classesLoading } = useQuery<any[]>({ queryKey: ["/api/classes"] });
  const { data: rawAssignments, isLoading: assignmentsLoading } = useQuery<any[]>({ queryKey: ["/api/assignments"] });
  const { data: rawBadges } = useQuery<any[]>({ queryKey: ["/api/badges"] });
  const { data: rawAttempts } = useQuery<any[]>({ queryKey: ["/api/quiz-attempts/mine"] });
  const { data: rawLiveSessions } = useQuery<any[]>({ queryKey: ["/api/sessions/student/live"], refetchInterval: 15000 });
  const classes = rawClasses || [];
  const assignments = rawAssignments || [];
  const badges = rawBadges || [];
  const myAttempts = rawAttempts || [];
  const liveSessions = rawLiveSessions || [];

  const allQuizzes: any[] = [];
  const classQuizQueries = classes.map((c: any) => c.id);
  const { data: quizzesByClass = {} } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/quizzes-for-student", ...classQuizQueries],
    queryFn: async () => {
      const result: Record<string, any[]> = {};
      for (const cls of classes) {
        const res = await fetch(`/api/quizzes?classId=${cls.id}`, { credentials: "include" });
        if (res.ok) result[cls.id] = await res.json();
      }
      return result;
    },
    enabled: classes.length > 0,
  });

  const availableQuizzes = Object.entries(quizzesByClass).flatMap(([classId, quizzes]) => {
    const cls = classes.find((c: any) => c.id === classId);
    return (quizzes || []).map((q: any) => ({
      ...q,
      className: cls?.title || "Unknown",
      attempted: myAttempts.some((a: any) => a.quizId === q.id),
      attemptScore: myAttempts.find((a: any) => a.quizId === q.id)?.score,
    }));
  });

  const joinClass = useMutation({
    mutationFn: (code: string) => apiRequest("POST", "/api/classes/join", { joinCode: code }),
    onSuccess: (cls: any) => {
      qc.invalidateQueries({ queryKey: ["/api/classes"] });
      setJoinOpen(false);
      setJoinCode("");
      toast({ title: "Joined!", description: `You've joined ${cls.title}` });
    },
    onError: (err: any) => toast({ title: "Error", description: err?.message || "Invalid code", variant: "destructive" }),
  });

  const levelInfo = user ? getLevelProgress(user.xp, user.level) : null;
  const styleInfo = user?.learningStyle ? learningStyleColors[user.learningStyle] : null;
  const upcomingAssignments = assignments.slice(0, 4);

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user?.name?.split(" ")[0]}`}
        subtitle="Keep learning — you're doing great!"
        actions={
          <Button size="sm" variant="outline" onClick={() => setJoinOpen(true)} data-testid="button-join-class">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Join Class
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* XP + Level Card */}
        <Card className="bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] border-0 text-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-amber-300" />
                  <span className="text-blue-100 text-xs font-medium">Level {user?.level}</span>
                  {styleInfo && (
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", "bg-white/20 text-white")}>
                      {styleInfo.label}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold font-mono">{user?.xp || 0} <span className="text-lg text-blue-200">XP</span></p>
                <p className="text-blue-200 text-xs mt-1">{levelInfo?.needed} XP to next level</p>
                <div className="mt-3">
                  <Progress value={levelInfo?.progress || 0} className="h-2 bg-white/20 [&>div]:bg-amber-300" />
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end mb-2">
                  <Flame className="w-4 h-4 text-orange-300" />
                  <span className="text-white font-bold">{user?.streakDays || 0}</span>
                  <span className="text-blue-200 text-xs">day streak</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span className="text-white font-bold">{badges.length}</span>
                  <span className="text-blue-200 text-xs">badges</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Classes" value={classes.length} subtitle="Enrolled" icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="Assignments" value={assignments.length} subtitle="Total assigned" icon={BookOpen} iconColor="text-purple-600" iconBg="bg-purple-50" />
          <StatCard title="XP Points" value={user?.xp || 0} subtitle="Total earned" icon={Zap} iconColor="text-amber-600" iconBg="bg-amber-50" />
          <StatCard title="Streak" value={`${user?.streakDays || 0}d`} subtitle="Current streak" icon={Flame} iconColor="text-orange-600" iconBg="bg-orange-50" />
        </div>

        {liveSessions.length > 0 && (
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
                <Radio className="w-4 h-4" />
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {liveSessions.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-emerald-100"
                  data-testid={`live-session-${s.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Wifi className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.title || "Live Session"}</p>
                      <p className="text-xs text-muted-foreground">{s.classTitle}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setLocation(`/student/session/${s.id}`)}
                    data-testid={`button-join-session-${s.id}`}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Join
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* My Classes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-sm font-semibold">My Classes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setJoinOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Join
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {classesLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
              ) : classes.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Not enrolled in any classes</p>
                  <Button size="sm" variant="outline" onClick={() => setJoinOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Join a Class
                  </Button>
                </div>
              ) : (
                classes.map((cls: any) => (
                  <div key={cls.id} data-testid={`class-item-${cls.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover-elevate">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{cls.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">{cls.subject}</p>
                        {cls.scheduleTime && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] text-muted-foreground">{cls.scheduleTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-xs shrink-0 whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                      onClick={() => setLocation(`/student/tutor/${cls.id}`)}
                    >
                      <Bot className="w-3.5 h-3.5 mr-1" />
                      Ask AI Tutor
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Assignments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-sm font-semibold">Reading Assignments</CardTitle>
              <Badge variant="outline" className="text-xs">{assignments.length} total</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignmentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              ) : upcomingAssignments.length === 0 ? (
                <div className="py-8 text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No assignments yet</p>
                </div>
              ) : (
                upcomingAssignments.map((a: any) => (
                  <div key={a.id} className="space-y-2" data-testid={`assignment-item-${a.id}`}>
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 cursor-pointer hover-elevate"
                      onClick={() => setLocation(`/student/reader/${a.id}`)}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: a.book?.coverColor || "#2563EB" }}
                      >
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{a.book?.title || "Book"}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-muted-foreground">{a.class?.title}</p>
                          {a.dueAt && (
                            <p className="text-xs text-orange-500 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              Due {format(new Date(a.dueAt), "MMM d")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0">
                        <Play className="w-2.5 h-2.5 mr-1" /> Read
                      </Button>
                    </div>
                    <AssignmentSubmit assignmentId={a.id} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Quizzes */}
        {availableQuizzes.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" /> Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableQuizzes.slice(0, 5).map((quiz: any) => (
                <div
                  key={quiz.id}
                  data-testid={`quiz-item-${quiz.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 cursor-pointer hover-elevate"
                  onClick={() => setLocation(`/student/quiz/${quiz.id}`)}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    quiz.attempted ? "bg-emerald-100" : "bg-blue-100"
                  )}>
                    {quiz.attempted
                      ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                      : <ClipboardCheck className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{quiz.title}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-muted-foreground">{quiz.className}</p>
                      {quiz.antiCheatEnabled && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-amber-600 border-amber-200">
                          <Shield className="w-2.5 h-2.5 mr-0.5" /> Proctored
                        </Badge>
                      )}
                    </div>
                  </div>
                  {quiz.attempted ? (
                    <Badge variant="secondary" className={cn(
                      "text-xs",
                      quiz.attemptScore >= 80 ? "bg-emerald-100 text-emerald-700" : quiz.attemptScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      {quiz.attemptScore}%
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0">
                      <Play className="w-2.5 h-2.5 mr-1" /> Take
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Badges Preview */}
        {badges.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-sm font-semibold">Recent Badges</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/student/profile")} data-testid="link-view-profile">
                View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {badges.slice(0, 6).map((badge: any) => (
                  <div
                    key={badge.id}
                    data-testid={`badge-${badge.badgeType}`}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50 border border-amber-100 min-w-[80px]"
                  >
                    <Trophy className="w-5 h-5 text-amber-600" />
                    <span className="text-[10px] font-semibold text-amber-800 text-center leading-tight">{badge.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Join Class Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Join a Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter the 6-character join code from your teacher</p>
            <Input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. MATH01"
              className="font-mono text-lg text-center tracking-widest h-12"
              maxLength={6}
              data-testid="input-join-code"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#2563EB] text-white"
              disabled={joinCode.length < 4 || joinClass.isPending}
              onClick={() => joinClass.mutate(joinCode)}
              data-testid="button-submit-join"
            >
              {joinClass.isPending ? "Joining..." : "Join Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
