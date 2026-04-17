import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Play, Users, Video, BookOpen, Plus, Trash2, Clock, AlertCircle, Trophy, Copy, ClipboardCheck, Shield } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const learningStyleColors: Record<string, string> = {
  visual: "bg-blue-100 text-blue-700",
  auditory: "bg-amber-100 text-amber-700",
  reading: "bg-emerald-100 text-emerald-700",
  kinetic: "bg-purple-100 text-purple-700",
  mixed: "bg-slate-100 text-slate-600",
};

export default function TeacherClassDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: cls, isLoading } = useQuery<any>({ queryKey: ["/api/classes", id] });
  const { data: books = [] } = useQuery<any[]>({ queryKey: ["/api/books"] });
  const { data: leaderboard = [] } = useQuery<any[]>({ queryKey: ["/api/leaderboard", id] });
  const { data: classQuizzes = [] } = useQuery<any[]>({
    queryKey: ["/api/quizzes", id],
    queryFn: async () => {
      const res = await fetch(`/api/quizzes?classId=${id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const startSession = useMutation({
    mutationFn: ({ classId, title }: { classId: string; title: string }) =>
      apiRequest("POST", "/api/sessions", { classId, title }),
    onSuccess: (session: any) => {
      qc.invalidateQueries({ queryKey: ["/api/sessions"] });
      setLocation(`/teacher/session/${session.id}`);
    },
  });

  const removeStudent = useMutation({
    mutationFn: ({ classId, studentId }: { classId: string; studentId: string }) =>
      apiRequest("DELETE", `/api/classes/${classId}/students/${studentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/classes/${id}`] });
      toast({ title: "Student removed" });
    },
  });

  const createAssignment = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/assignments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/classes/${id}`] });
      setAssignOpen(false);
      setSelectedBookId("");
      setDueAt("");
      toast({ title: "Assignment created", description: "Students will be notified" });
    },
  });

  function copyCode() {
    if (cls?.joinCode) {
      navigator.clipboard.writeText(cls.joinCode);
      toast({ title: "Join code copied!" });
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <div className="p-6 space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!cls) {
    return (
      <div>
        <PageHeader title="Class not found" />
        <div className="p-6 text-center text-muted-foreground">Class not found</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={cls.title}
        subtitle={`${cls.subject} · ${cls.students?.length || 0} students`}
        actions={
          <Button
            size="sm"
            className="bg-red-500 text-white"
            onClick={() => startSession.mutate({ classId: cls.id, title: `${cls.title} - Live Session` })}
            disabled={startSession.isPending}
            data-testid="button-start-session"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" /> Go Live
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Class Info Bar */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-[#EFF6FF] rounded-xl border border-blue-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Join Code:</span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 font-mono font-bold text-lg text-[#1E3A5F] hover:text-[#2563EB] transition-colors"
              data-testid="button-copy-code"
            >
              {cls.joinCode}
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Schedule:</span>
            <span className="text-xs font-medium">{cls.scheduleTime || "Not set"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">XP:</span>
            <Badge className={cls.gamificationEnabled ? "bg-amber-100 text-amber-700 border-0" : "bg-muted text-muted-foreground border-0"}>
              {cls.gamificationEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students" data-testid="tab-students">Students ({cls.students?.length || 0})</TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">Sessions ({cls.sessions?.length || 0})</TabsTrigger>
            <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments ({cls.assignments?.length || 0})</TabsTrigger>
            <TabsTrigger value="quizzes" data-testid="tab-quizzes">Quizzes ({classQuizzes.length})</TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-5">
            <Card>
              <CardContent className="p-0">
                {!cls.students?.length ? (
                  <div className="p-12 text-center">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-semibold mb-1">No students enrolled</p>
                    <p className="text-sm text-muted-foreground">Share the code <strong>{cls.joinCode}</strong> to invite students</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {cls.students.map((student: any, idx: number) => (
                      <div key={student.id} data-testid={`student-row-${student.id}`} className="flex items-center gap-4 px-5 py-4">
                        <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}</span>
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          {student.learningStyle && (
                            <Badge className={cn("text-[10px] border-0", learningStyleColors[student.learningStyle] || "bg-muted text-muted-foreground")}>
                              {student.learningStyle}
                            </Badge>
                          )}
                          <div className="text-right">
                            <p className="text-xs font-bold text-foreground font-mono">{student.xp} XP</p>
                            <p className="text-[10px] text-muted-foreground">Lvl {student.level}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground"
                            onClick={() => { if (confirm("Remove student?")) removeStudent.mutate({ classId: cls.id, studentId: student.id }); }}
                            data-testid={`remove-student-${student.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="mt-5">
            <Card>
              <CardContent className="p-0">
                {!cls.sessions?.length ? (
                  <div className="p-12 text-center">
                    <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-semibold mb-1">No sessions yet</p>
                    <p className="text-sm text-muted-foreground">Start a live session to begin monitoring attention</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {cls.sessions.map((session: any) => (
                      <div
                        key={session.id}
                        data-testid={`session-row-${session.id}`}
                        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover-elevate"
                        onClick={() => setLocation(`/teacher/session/${session.id}`)}
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <Video className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{session.title || "Live Session"}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.startedAt ? format(new Date(session.startedAt), "MMM d, yyyy · h:mm a") : "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {session.avgAttention && (
                            <div className="text-right">
                              <p className="text-xs font-bold font-mono">{Math.round(session.avgAttention)}%</p>
                              <p className="text-[10px] text-muted-foreground">Avg. attention</p>
                            </div>
                          )}
                          <Badge className={session.status === "live" ? "bg-red-50 text-red-600 border-0" : "bg-muted text-muted-foreground border-0"}>
                            {session.status === "live" ? "Live" : "Ended"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="mt-5">
            <div className="flex justify-end mb-4">
              <Button size="sm" className="bg-[#2563EB] text-white" onClick={() => setAssignOpen(true)} data-testid="button-create-assignment">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Assign Book
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {!cls.assignments?.length ? (
                  <div className="p-12 text-center">
                    <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-semibold mb-1">No assignments yet</p>
                    <p className="text-sm text-muted-foreground">Assign books for students to read</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {cls.assignments.map((a: any) => (
                      <div key={a.id} data-testid={`assignment-row-${a.id}`} className="flex items-center gap-4 px-5 py-4">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">Assignment</p>
                          {a.dueAt && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due {format(new Date(a.dueAt), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                        {a.timerSeconds && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {Math.round(a.timerSeconds / 60)} min
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quizzes" className="mt-5">
            <Card>
              <CardContent className="p-0">
                {classQuizzes.length === 0 ? (
                  <div className="p-12 text-center">
                    <ClipboardCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-semibold mb-1">No quizzes yet</p>
                    <p className="text-sm text-muted-foreground mb-3">Create quizzes from the Quizzes page</p>
                    <Button variant="outline" size="sm" onClick={() => setLocation("/teacher/quizzes")} data-testid="link-go-quizzes">
                      <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Go to Quizzes
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {classQuizzes.map((quiz: any) => {
                      const questionCount = (quiz.questions as any[])?.length || 0;
                      return (
                        <div key={quiz.id} className="flex items-center gap-4 px-5 py-4" data-testid={`class-quiz-${quiz.id}`}>
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <ClipboardCheck className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{quiz.title}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-muted-foreground">{questionCount} questions</span>
                              {quiz.timeLimitSeconds && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> {Math.floor(quiz.timeLimitSeconds / 60)}m
                                </span>
                              )}
                              {quiz.antiCheatEnabled && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 text-amber-600 border-amber-200">
                                  <Shield className="w-2.5 h-2.5 mr-0.5" /> Anti-Cheat
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">{quiz.attemptCount || 0} attempts</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-5">
            <Card>
              <CardContent className="p-0">
                {!leaderboard.length ? (
                  <div className="p-12 text-center">
                    <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-semibold mb-1">No leaderboard data yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {leaderboard.map((entry: any) => (
                      <div key={entry.user?.id} data-testid={`leaderboard-row-${entry.rank}`} className="flex items-center gap-4 px-5 py-4">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                          entry.rank === 1 ? "bg-amber-100 text-amber-700" :
                          entry.rank === 2 ? "bg-slate-100 text-slate-600" :
                          entry.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                        )}>
                          {entry.rank}
                        </div>
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {entry.user?.name ? getInitials(entry.user.name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{entry.user?.name}</p>
                          <p className="text-xs text-muted-foreground">Level {entry.user?.level}</p>
                        </div>
                        <p className="text-sm font-bold font-mono text-primary">{entry.xp} XP</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assign Book Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Book to Class</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Book</Label>
              <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                <SelectTrigger data-testid="select-book">
                  <SelectValue placeholder="Choose a book" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date (optional)</Label>
              <Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} data-testid="input-due-date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#2563EB] text-white"
              disabled={!selectedBookId || createAssignment.isPending}
              onClick={() => createAssignment.mutate({ bookId: selectedBookId, classId: cls.id, dueAt: dueAt || undefined })}
              data-testid="button-submit-assignment"
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
