import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ClipboardCheck, Shield, Clock, Users,
  ChevronRight, CheckCircle, XCircle, AlertTriangle, Trophy, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function TeacherQuizzes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [resultsQuizId, setResultsQuizId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [antiCheat, setAntiCheat] = useState(false);
  const [timeLimit, setTimeLimit] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { question: "", options: ["", "", "", ""], correctIndex: 0 },
  ]);

  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({ queryKey: ["/api/classes"] });

  const selectedClassId = classId || (classes.length > 0 ? classes[0]?.id : "");
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery<any[]>({
    queryKey: ["/api/quizzes", selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await fetch(`/api/quizzes?classId=${selectedClassId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedClassId,
  });

  const { data: results = [] } = useQuery<any[]>({
    queryKey: ["/api/quizzes", resultsQuizId, "results"],
    queryFn: async () => {
      if (!resultsQuizId) return [];
      const res = await fetch(`/api/quizzes/${resultsQuizId}/results`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!resultsQuizId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/quizzes", {
        classId: classId,
        title,
        questions,
        timeLimitSeconds: timeLimit ? parseInt(timeLimit) * 60 : undefined,
        antiCheatEnabled: antiCheat,
      });
    },
    onSuccess: () => {
      toast({ title: "Quiz created", description: "Students have been notified." });
      qc.invalidateQueries({ queryKey: ["/api/quizzes"] });
      resetForm();
      setCreateOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create quiz.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/quizzes/${id}`),
    onSuccess: () => {
      toast({ title: "Quiz deleted" });
      qc.invalidateQueries({ queryKey: ["/api/quizzes"] });
    },
  });

  function resetForm() {
    setTitle("");
    setAntiCheat(false);
    setTimeLimit("");
    setQuestions([{ question: "", options: ["", "", "", ""], correctIndex: 0 }]);
  }

  function addQuestion() {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctIndex: 0 }]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, field: string, value: any) {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  }

  const isFormValid = title.trim() && classId && questions.every(q =>
    q.question.trim() && q.options.every(o => o.trim())
  );

  const selectedQuiz = quizzes.find((q: any) => q.id === resultsQuizId);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Quizzes" subtitle="Create and manage quizzes for your classes" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Class:</Label>
            <Select value={selectedClassId} onValueChange={(v) => setClassId(v)}>
              <SelectTrigger className="w-[260px]" data-testid="select-quiz-class">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setClassId(selectedClassId); setCreateOpen(true); }} data-testid="button-create-quiz">
            <Plus className="w-4 h-4 mr-2" /> Create Quiz
          </Button>
        </div>

        {quizzesLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-muted-foreground">No quizzes yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create a quiz to test your students' knowledge</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz: any) => {
              const questionCount = (quiz.questions as any[])?.length || 0;
              return (
                <Card key={quiz.id} className="hover:shadow-md transition-shadow" data-testid={`card-quiz-${quiz.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base leading-tight">{quiz.title}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(quiz.id)}
                        data-testid={`button-delete-quiz-${quiz.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <ClipboardCheck className="w-3 h-3 mr-1" />
                        {questionCount} questions
                      </Badge>
                      {quiz.timeLimitSeconds && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {Math.floor(quiz.timeLimitSeconds / 60)} min
                        </Badge>
                      )}
                      {quiz.antiCheatEnabled && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                          <Shield className="w-3 h-3 mr-1" />
                          Anti-Cheat
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        <Users className="w-3 h-3 inline mr-1" />
                        {quiz.attemptCount || 0} attempts
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setResultsQuizId(quiz.id)}
                        data-testid={`button-view-results-${quiz.id}`}
                      >
                        <Eye className="w-3 h-3 mr-1" /> Results
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Created {format(new Date(quiz.createdAt), "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Quiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Quiz Title</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 Review"
                  data-testid="input-quiz-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger data-testid="select-quiz-class-create">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch checked={antiCheat} onCheckedChange={setAntiCheat} data-testid="switch-anti-cheat" />
                <div>
                  <Label className="text-sm">Anti-Cheat Mode</Label>
                  <p className="text-xs text-muted-foreground">Fullscreen, tab detection, copy block</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Time Limit (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={timeLimit}
                  onChange={e => setTimeLimit(e.target.value)}
                  placeholder="Optional"
                  className="w-28"
                  data-testid="input-time-limit"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Questions ({questions.length})</Label>
                <Button variant="outline" size="sm" onClick={addQuestion} data-testid="button-add-question">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                </Button>
              </div>

              {questions.map((q, qi) => (
                <Card key={qi} className="border-dashed">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs text-muted-foreground">Question {qi + 1}</Label>
                        <Input
                          value={q.question}
                          onChange={e => updateQuestion(qi, "question", e.target.value)}
                          placeholder="Enter your question..."
                          data-testid={`input-question-${qi}`}
                        />
                      </div>
                      {questions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 mt-5 text-muted-foreground hover:text-destructive"
                          onClick={() => removeQuestion(qi)}
                          data-testid={`button-remove-question-${qi}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(qi, "correctIndex", oi)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                              q.correctIndex === oi
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-muted-foreground/30 hover:border-emerald-300"
                            )}
                            data-testid={`button-correct-${qi}-${oi}`}
                          >
                            {q.correctIndex === oi && <CheckCircle className="w-3.5 h-3.5" />}
                          </button>
                          <Input
                            value={opt}
                            onChange={e => updateOption(qi, oi, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            className="text-sm"
                            data-testid={`input-option-${qi}-${oi}`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Click the circle to mark the correct answer</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!isFormValid || createMutation.isPending}
              data-testid="button-submit-quiz"
            >
              {createMutation.isPending ? "Creating..." : "Create Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resultsQuizId} onOpenChange={(open) => !open && setResultsQuizId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Results: {selectedQuiz?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {results.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attempts yet</p>
            ) : (
              <>
                <div className="flex items-center gap-4 text-sm text-muted-foreground pb-2">
                  <span>{results.length} attempt(s)</span>
                  <span>Avg: {Math.round(results.reduce((s: number, a: any) => s + a.score, 0) / results.length)}%</span>
                </div>
                {results.map((attempt: any) => {
                  const flags = (attempt.flags as any[]) || [];
                  const tabSwitches = flags.filter((f: any) => f.type === "tab_switch").length;
                  return (
                    <div key={attempt.id} className="flex items-center gap-3 p-3 rounded-lg border" data-testid={`result-attempt-${attempt.id}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {attempt.student ? getInitials(attempt.student.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attempt.student?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(attempt.completedAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className={cn(
                          "text-sm font-bold",
                          attempt.score >= 80 ? "text-emerald-600" : attempt.score >= 50 ? "text-amber-600" : "text-red-500"
                        )}>
                          {attempt.score}%
                        </p>
                        {tabSwitches > 0 && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                            {tabSwitches} tab switch{tabSwitches > 1 ? "es" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
