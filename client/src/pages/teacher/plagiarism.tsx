import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldAlert, Search, AlertTriangle, CheckCircle, Users,
  ChevronDown, ChevronUp, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlagiarismPair {
  studentA: { id: string; name: string };
  studentB: { id: string; name: string };
  similarity: number;
  matchingWrong: number;
  totalQuestions: number;
  matchingAnswers: number;
  riskLevel: "high" | "medium" | "low";
  details: {
    questionIndex: number;
    question: string;
    answerA: number;
    answerB: number;
    correct: number;
    bothWrong: boolean;
  }[];
}

interface PlagiarismResult {
  pairs: PlagiarismPair[];
  quizTitle: string;
  totalAttempts: number;
}

type ClassItem = { id: string; title: string; subject: string };
type QuizItem = { id: string; title: string; classId: string };

export default function TeacherPlagiarism() {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [detailPair, setDetailPair] = useState<PlagiarismPair | null>(null);

  const { data: classes, isLoading: classesLoading } = useQuery<ClassItem[]>({
    queryKey: ["/api/classes"],
  });

  const { data: quizzes, isLoading: quizzesLoading } = useQuery<QuizItem[]>({
    queryKey: ["/api/quizzes", selectedClassId],
    queryFn: async () => {
      const res = await fetch(`/api/quizzes?classId=${selectedClassId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load quizzes");
      return res.json();
    },
    enabled: !!selectedClassId,
  });

  const { data: result, isLoading: scanning, isError: scanError } = useQuery<PlagiarismResult>({
    queryKey: ["/api/quizzes", selectedQuizId, "plagiarism"],
    queryFn: async () => {
      const res = await fetch(`/api/quizzes/${selectedQuizId}/plagiarism`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to run plagiarism scan");
      return res.json();
    },
    enabled: !!selectedQuizId,
  });

  const highCount = result?.pairs.filter(p => p.riskLevel === "high").length || 0;
  const mediumCount = result?.pairs.filter(p => p.riskLevel === "medium").length || 0;

  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    setSelectedQuizId("");
  }

  return (
    <div className="flex-1 overflow-auto bg-[#F8FAFC]">
      <PageHeader
        title="Plagiarism Detection"
        subtitle="Detect suspicious answer patterns across quiz attempts"
      />

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Select Class</label>
                <Select value={selectedClassId} onValueChange={handleClassChange}>
                  <SelectTrigger data-testid="select-class">
                    <SelectValue placeholder={classesLoading ? "Loading..." : "Choose a class"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title} — {c.subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Select Quiz</label>
                <Select value={selectedQuizId} onValueChange={setSelectedQuizId} disabled={!selectedClassId}>
                  <SelectTrigger data-testid="select-quiz">
                    <SelectValue placeholder={!selectedClassId ? "Select a class first" : quizzesLoading ? "Loading..." : "Choose a quiz"} />
                  </SelectTrigger>
                  <SelectContent>
                    {quizzes?.map(q => (
                      <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedQuizId && !scanning && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1" data-testid="text-empty-state">Select a Quiz to Scan</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Choose a class and quiz above to analyze student answer patterns for potential copying.
            </p>
          </div>
        )}

        {scanning && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {scanError && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Scan Failed</h3>
              <p className="text-sm text-muted-foreground">
                Could not run plagiarism analysis. Please try again later.
              </p>
            </CardContent>
          </Card>
        )}

        {result && !scanning && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-total-attempts">{result.totalAttempts}</p>
                    <p className="text-xs text-muted-foreground">Total Attempts</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-high-risk">{highCount}</p>
                    <p className="text-xs text-muted-foreground">High Risk Pairs</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-medium-risk">{mediumCount}</p>
                    <p className="text-xs text-muted-foreground">Medium Risk Pairs</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {result.pairs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1" data-testid="text-no-plagiarism">No Suspicious Patterns Found</h3>
                  <p className="text-sm text-muted-foreground">
                    No student pairs had answer similarity above 60%. All submissions appear to be independent.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Flagged Pairs — {result.quizTitle}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {result.pairs.map((pair, i) => (
                      <div
                        key={i}
                        className="px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                        data-testid={`plagiarism-pair-${i}`}
                      >
                        <div className="flex-shrink-0">
                          <Badge
                            variant={pair.riskLevel === "high" ? "destructive" : pair.riskLevel === "medium" ? "secondary" : "outline"}
                            className={cn(
                              "text-[11px] font-semibold uppercase px-2",
                              pair.riskLevel === "medium" && "bg-amber-100 text-amber-700 border-amber-200"
                            )}
                            data-testid={`risk-level-${i}`}
                          >
                            {pair.riskLevel}
                          </Badge>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <span data-testid={`student-a-${i}`}>{pair.studentA.name}</span>
                            <span className="text-muted-foreground">↔</span>
                            <span data-testid={`student-b-${i}`}>{pair.studentB.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{pair.matchingAnswers}/{pair.totalQuestions} matching</span>
                            <span>•</span>
                            <span className={pair.matchingWrong > 0 ? "text-red-500 font-medium" : ""}>
                              {pair.matchingWrong} same wrong answer{pair.matchingWrong !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={cn(
                              "text-lg font-bold",
                              pair.similarity >= 85 ? "text-red-500" :
                              pair.similarity >= 70 ? "text-amber-500" : "text-slate-600"
                            )} data-testid={`similarity-${i}`}>
                              {pair.similarity}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">similarity</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailPair(pair)}
                            data-testid={`button-view-details-${i}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={!!detailPair} onOpenChange={() => setDetailPair(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          {detailPair && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" data-testid="dialog-title">
                  <ShieldAlert className="w-5 h-5" />
                  Answer Comparison
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {detailPair.studentA.name} vs {detailPair.studentB.name} — {detailPair.similarity}% similarity
                </p>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-3 text-center text-sm py-3 border-b">
                <div>
                  <p className="text-2xl font-bold text-[#2563EB]">{detailPair.matchingAnswers}</p>
                  <p className="text-xs text-muted-foreground">Matching Answers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{detailPair.matchingWrong}</p>
                  <p className="text-xs text-muted-foreground">Same Wrong</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{detailPair.totalQuestions}</p>
                  <p className="text-xs text-muted-foreground">Total Questions</p>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Matching Answers Detail</p>
                {detailPair.details.map((d, di) => (
                  <div
                    key={di}
                    className={cn(
                      "rounded-lg border p-3 text-sm",
                      d.bothWrong ? "bg-red-50 border-red-200" : "bg-green-50/50 border-green-200"
                    )}
                    data-testid={`detail-row-${di}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-xs text-muted-foreground mb-0.5">Q{d.questionIndex + 1}</p>
                        <p className="text-sm">{d.question}</p>
                      </div>
                      {d.bothWrong ? (
                        <Badge variant="destructive" className="text-[10px] flex-shrink-0">
                          Both Wrong
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 bg-green-50 flex-shrink-0">
                          Both Correct
                        </Badge>
                      )}
                    </div>
                    {d.bothWrong && (
                      <p className="text-xs text-red-600 mt-1.5">
                        Both selected option {d.answerA + 1} (correct was option {d.correct + 1})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
