import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, Shield, AlertTriangle, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Send, Trophy, Zap,
  Eye, EyeOff, Maximize, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

export default function StudentQuiz() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const tabSwitchCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  const { data: quiz, isLoading } = useQuery<any>({
    queryKey: ["/api/quizzes", id],
  });

  const questions: Question[] = (quiz?.questions as Question[]) || [];

  useEffect(() => {
    if (quiz && answers.length === 0 && questions.length > 0) {
      setAnswers(new Array(questions.length).fill(null));
    }
  }, [quiz, questions.length]);

  useEffect(() => {
    if (!started || !quiz?.timeLimitSeconds || submitted) return;
    setTimeLeft(quiz.timeLimitSeconds);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, submitted]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && started && !submitted && quiz?.antiCheatEnabled) {
      tabSwitchCountRef.current++;
      const flag = { type: "tab_switch", timestamp: Date.now(), count: tabSwitchCountRef.current };
      setFlags(prev => [...prev, flag]);
      if (tabSwitchCountRef.current >= 2) {
        toast({
          title: "Warning: Tab Switch Detected",
          description: `You have switched tabs ${tabSwitchCountRef.current} time(s). This will be flagged.`,
          variant: "destructive",
        });
      }
    }
  }, [started, submitted, quiz?.antiCheatEnabled]);

  useEffect(() => {
    if (!started || !quiz?.antiCheatEnabled) return;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [started, handleVisibilityChange, quiz?.antiCheatEnabled]);

  useEffect(() => {
    if (!started || !quiz?.antiCheatEnabled || submitted) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({ title: "Copy/Paste Disabled", description: "Clipboard is blocked during quiz.", variant: "destructive" });
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [started, quiz?.antiCheatEnabled, submitted]);

  useEffect(() => {
    if (!started || !quiz?.antiCheatEnabled || submitted) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && started && !submitted) {
        setFullscreenWarning(true);
        setFlags(prev => [...prev, { type: "fullscreen_exit", timestamp: Date.now() }]);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [started, quiz?.antiCheatEnabled, submitted]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/quizzes/${id}/attempt`, {
        answers,
        flags,
      });
    },
    onSuccess: (data) => {
      setSubmitted(true);
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quiz-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to submit quiz", variant: "destructive" });
    },
  });

  function handleSubmit() {
    setConfirmSubmit(false);
    submitMutation.mutate();
  }

  function startQuiz() {
    startTimeRef.current = Date.now();
    setStarted(true);
    if (quiz?.antiCheatEnabled) {
      document.documentElement.requestFullscreen?.().catch(() => {
        toast({ title: "Fullscreen Required", description: "Please allow fullscreen for anti-cheat mode.", variant: "destructive" });
      });
    }
  }

  function selectAnswer(index: number) {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = index;
    setAnswers(newAnswers);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const answeredCount = answers.filter(a => a !== null).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Quiz" subtitle="Loading..." />
        <div className="p-6 max-w-3xl mx-auto">
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Quiz Not Found" subtitle="This quiz doesn't exist" />
      </div>
    );
  }

  if (quiz.existingAttempt && !submitted) {
    const attempt = quiz.existingAttempt;
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={quiz.title} subtitle="Quiz already completed" />
        <div className="p-6 max-w-lg mx-auto">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className={cn(
                "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
                attempt.score >= 80 ? "bg-emerald-100" : attempt.score >= 50 ? "bg-amber-100" : "bg-red-100"
              )}>
                <span className={cn(
                  "text-2xl font-bold",
                  attempt.score >= 80 ? "text-emerald-600" : attempt.score >= 50 ? "text-amber-600" : "text-red-500"
                )}>
                  {attempt.score}%
                </span>
              </div>
              <p className="text-muted-foreground">You've already completed this quiz</p>
              <Button variant="outline" onClick={() => setLocation("/student")} data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Quiz Complete" subtitle={quiz.title} />
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className={cn(
                "w-24 h-24 rounded-full mx-auto flex items-center justify-center",
                result.scorePercent >= 80 ? "bg-emerald-100" : result.scorePercent >= 50 ? "bg-amber-100" : "bg-red-100"
              )}>
                <div>
                  <p className={cn(
                    "text-3xl font-bold",
                    result.scorePercent >= 80 ? "text-emerald-600" : result.scorePercent >= 50 ? "text-amber-600" : "text-red-500"
                  )}>
                    {result.scorePercent}%
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold">{result.correct}/{result.total} Correct</p>
              {result.xpAwarded > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-3 py-1">
                  <Zap className="w-4 h-4 mr-1" /> +{result.xpAwarded} XP Earned!
                </Badge>
              )}
              {result.scorePercent === 100 && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-sm px-3 py-1">
                  <Trophy className="w-4 h-4 mr-1" /> Perfect Quiz Badge!
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Answer Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q, qi) => {
                const userAnswer = answers[qi];
                const isCorrect = userAnswer === q.correctIndex;
                return (
                  <div key={qi} className={cn(
                    "p-3 rounded-lg border",
                    isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
                  )} data-testid={`review-question-${qi}`}>
                    <div className="flex items-start gap-2">
                      {isCorrect
                        ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{q.question}</p>
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className={cn(
                              "text-xs px-2 py-1 rounded",
                              oi === q.correctIndex && "bg-emerald-200/50 font-medium",
                              oi === userAnswer && oi !== q.correctIndex && "bg-red-200/50 line-through",
                            )}>
                              {String.fromCharCode(65 + oi)}. {opt}
                              {oi === q.correctIndex && " ✓"}
                              {oi === userAnswer && oi !== q.correctIndex && " (your answer)"}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="text-center">
            <Button onClick={() => setLocation("/student")} data-testid="button-finish-quiz">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={quiz.title} subtitle="Ready to start?" />
        <div className="p-6 max-w-lg mx-auto">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">{quiz.title}</h2>
                <p className="text-muted-foreground text-sm">Please review the quiz details before starting</p>
              </div>

              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Questions</span>
                  <span className="text-sm font-medium">{questions.length}</span>
                </div>
                {quiz.timeLimitSeconds && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Time Limit</span>
                    <span className="text-sm font-medium">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      {Math.floor(quiz.timeLimitSeconds / 60)} minutes
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Anti-Cheat</span>
                  <Badge variant={quiz.antiCheatEnabled ? "default" : "secondary"} className="text-xs">
                    {quiz.antiCheatEnabled ? (
                      <><Shield className="w-3 h-3 mr-1" /> Enabled</>
                    ) : "Disabled"}
                  </Badge>
                </div>
              </div>

              {quiz.antiCheatEnabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Anti-Cheat Notice
                  </p>
                  <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                    <li>Quiz will enter fullscreen mode</li>
                    <li>Tab switches will be detected and flagged</li>
                    <li>Copy/paste will be disabled</li>
                    <li>Right-click will be disabled</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setLocation("/student")} data-testid="button-cancel-quiz">
                  Cancel
                </Button>
                <Button className="flex-1" onClick={startQuiz} data-testid="button-start-quiz">
                  Start Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{quiz.title}</span>
            {quiz.antiCheatEnabled && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                <Shield className="w-3 h-3 mr-1" /> Anti-Cheat Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            {timeLeft !== null && (
              <Badge variant={timeLeft < 60 ? "destructive" : "secondary"} className="text-sm font-mono px-3">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {formatTime(timeLeft)}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length} answered</span>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-2">
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {questions.map((_, qi) => (
            <button
              key={qi}
              onClick={() => setCurrentQuestion(qi)}
              className={cn(
                "w-8 h-8 rounded-md text-xs font-medium transition-colors border",
                qi === currentQuestion && "ring-2 ring-primary ring-offset-1",
                answers[qi] !== null
                  ? "bg-primary text-white border-primary"
                  : "bg-background border-muted-foreground/20 hover:bg-muted"
              )}
              data-testid={`button-nav-question-${qi}`}
            >
              {qi + 1}
            </button>
          ))}
        </div>

        {questions[currentQuestion] && (
          <Card data-testid={`card-question-${currentQuestion}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">Question {currentQuestion + 1} of {questions.length}</Badge>
              </div>
              <CardTitle className="text-lg mt-2">{questions[currentQuestion].question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {questions[currentQuestion].options.map((option, oi) => (
                <button
                  key={oi}
                  onClick={() => selectAnswer(oi)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all flex items-center gap-3",
                    answers[currentQuestion] === oi
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                  )}
                  data-testid={`button-answer-${currentQuestion}-${oi}`}
                >
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
                    answers[currentQuestion] === oi
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="text-sm">{option}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            data-testid="button-prev-question"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={() => setConfirmSubmit(true)}
              disabled={submitMutation.isPending}
              data-testid="button-submit-quiz"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitMutation.isPending ? "Submitting..." : "Submit Quiz"}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
              data-testid="button-next-question"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz?</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.
            </p>
            {answeredCount < questions.length && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {questions.length - answeredCount} question(s) are unanswered and will be marked incorrect.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Continue Quiz</Button>
            <Button onClick={handleSubmit} data-testid="button-confirm-submit">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fullscreenWarning} onOpenChange={setFullscreenWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" /> Fullscreen Exited
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have exited fullscreen mode. This action has been flagged. Please return to fullscreen to continue the quiz.
          </p>
          <DialogFooter>
            <Button onClick={() => {
              setFullscreenWarning(false);
              document.documentElement.requestFullscreen?.().catch(() => {});
            }}>
              <Maximize className="w-4 h-4 mr-2" /> Return to Fullscreen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
