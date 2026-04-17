import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText, Download, Eye, CheckCircle, Clock, Users,
  ShieldAlert, AlertTriangle, Search, Star, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ClassItem = { id: string; title: string; subject: string };
type AssignmentItem = { id: string; bookId: string; classId: string; book?: { title: string } };

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
  submittedAt: string;
  student?: { id: string; name: string; email: string };
}

interface MatchingPassage {
  text: string;
  contextA: string;
  contextB: string;
}

interface PlagiarismPair {
  studentA: { id: string; name: string };
  studentB: { id: string; name: string };
  similarity: number;
  matchingPassages: MatchingPassage[];
  riskLevel: "high" | "medium" | "low";
}

export default function TeacherSubmissions() {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [gradeDialog, setGradeDialog] = useState<Submission | null>(null);
  const [gradeValue, setGradeValue] = useState("");
  const [feedbackValue, setFeedbackValue] = useState("");
  const [plagiarismDialog, setPlagiarismDialog] = useState(false);
  const [expandedPair, setExpandedPair] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: classes } = useQuery<ClassItem[]>({ queryKey: ["/api/classes"] });

  const { data: allAssignments } = useQuery<AssignmentItem[]>({
    queryKey: ["/api/assignments", selectedClassId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments?classId=${selectedClassId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedClassId,
  });

  const { data: submissions, isLoading: subsLoading } = useQuery<Submission[]>({
    queryKey: ["/api/assignments", selectedAssignmentId, "submissions"],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${selectedAssignmentId}/submissions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!selectedAssignmentId,
  });

  const { data: plagiarismResult, isLoading: plagiarismLoading } = useQuery<{
    pairs: PlagiarismPair[];
    assignmentTitle: string;
    totalSubmissions: number;
  }>({
    queryKey: ["/api/assignments", selectedAssignmentId, "plagiarism"],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${selectedAssignmentId}/plagiarism`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedAssignmentId && plagiarismDialog,
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ id, grade, feedback }: { id: string; grade: number; feedback?: string }) => {
      return apiRequest("POST", `/api/submissions/${id}/grade`, { grade, feedback });
    },
    onSuccess: () => {
      setGradeDialog(null);
      queryClient.invalidateQueries({ queryKey: ["/api/assignments", selectedAssignmentId, "submissions"] });
      toast({ title: "Graded!", description: "Submission has been graded successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save grade.", variant: "destructive" });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async (pairs: PlagiarismPair[]) => {
      return apiRequest("POST", `/api/assignments/${selectedAssignmentId}/plagiarism-flag`, { pairs });
    },
    onSuccess: (data: any) => {
      toast({ title: "Students Notified", description: `Plagiarism alerts sent to ${data.notifiedCount} student(s).` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send notifications.", variant: "destructive" });
    },
  });

  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    setSelectedAssignmentId("");
  }

  function openGradeDialog(sub: Submission) {
    setGradeValue(sub.grade?.toString() || "");
    setFeedbackValue(sub.feedback || "");
    setGradeDialog(sub);
  }

  function handleGrade() {
    if (!gradeDialog) return;
    const grade = parseInt(gradeValue);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast({ title: "Invalid grade", description: "Enter a number between 0 and 100.", variant: "destructive" });
      return;
    }
    gradeMutation.mutate({ id: gradeDialog.id, grade, feedback: feedbackValue || undefined });
  }

  function renderHighlighted(context: string, matchText: string) {
    if (!context || !matchText) return <span>{context || ""}</span>;
    const lowerCtx = context.toLowerCase();
    const lowerMatch = matchText.toLowerCase().substring(0, 100);
    const idx = lowerCtx.indexOf(lowerMatch);
    if (idx >= 0) {
      const before = context.substring(0, idx);
      const match = context.substring(idx, idx + lowerMatch.length);
      const after = context.substring(idx + lowerMatch.length);
      return <span>{before}<mark className="bg-red-200 text-red-900 px-0.5 rounded">{match}</mark>{after}</span>;
    }
    const words = matchText.split(/\s+/).slice(0, 6).join(" ").toLowerCase();
    const wIdx = lowerCtx.indexOf(words);
    if (wIdx >= 0) {
      const before = context.substring(0, wIdx);
      const match = context.substring(wIdx, wIdx + words.length);
      const after = context.substring(wIdx + words.length);
      return <span>{before}<mark className="bg-red-200 text-red-900 px-0.5 rounded">{match}</mark>{after}</span>;
    }
    return <span>{context}</span>;
  }

  const gradedCount = submissions?.filter(s => s.grade !== null).length || 0;
  const avgGrade = submissions?.filter(s => s.grade !== null).length
    ? Math.round(submissions.filter(s => s.grade !== null).reduce((sum, s) => sum + (s.grade || 0), 0) / submissions.filter(s => s.grade !== null).length)
    : 0;

  return (
    <div className="flex-1 overflow-auto bg-[#F8FAFC]">
      <PageHeader
        title="Submissions"
        subtitle="View student submissions, grade assignments, and check for plagiarism"
      />

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Select Class</label>
                <Select value={selectedClassId} onValueChange={handleClassChange}>
                  <SelectTrigger data-testid="select-class">
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title} — {c.subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Select Assignment</label>
                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId} disabled={!selectedClassId}>
                  <SelectTrigger data-testid="select-assignment">
                    <SelectValue placeholder={!selectedClassId ? "Select a class first" : "Choose an assignment"} />
                  </SelectTrigger>
                  <SelectContent>
                    {allAssignments?.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.book?.title || `Assignment`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedAssignmentId && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1" data-testid="text-empty-state">Select an Assignment</h3>
            <p className="text-sm text-muted-foreground">Choose a class and assignment to view student submissions.</p>
          </div>
        )}

        {subsLoading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {submissions && !subsLoading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-total-submissions">{submissions.length}</p>
                    <p className="text-xs text-muted-foreground">Submissions</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-graded-count">{gradedCount}</p>
                    <p className="text-xs text-muted-foreground">Graded</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-avg-grade">{avgGrade || "—"}</p>
                    <p className="text-xs text-muted-foreground">Avg Grade</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Student Submissions</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlagiarismDialog(true)}
                disabled={submissions.length < 2}
                data-testid="button-check-plagiarism"
              >
                <ShieldAlert className="w-4 h-4 mr-1" /> Check Plagiarism
              </Button>
            </div>

            {submissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No submissions yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {submissions.map((sub, i) => (
                      <div key={sub.id} className="px-5 py-4 flex items-center gap-4" data-testid={`submission-row-${i}`}>
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" data-testid={`submission-student-${i}`}>
                            {sub.student?.name || "Unknown"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate" data-testid={`submission-file-${i}`}>
                              {sub.fileName}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              ({(sub.fileSize / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {sub.grade !== null ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200" data-testid={`submission-grade-${i}`}>
                              {sub.grade}/100
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300" data-testid={`submission-ungraded-${i}`}>
                              Ungraded
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/api/submissions/${sub.id}/file`, "_blank")}
                            data-testid={`button-view-file-${i}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openGradeDialog(sub)}
                            data-testid={`button-grade-${i}`}
                          >
                            {sub.grade !== null ? "Edit Grade" : "Grade"}
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

      <Dialog open={!!gradeDialog} onOpenChange={() => setGradeDialog(null)}>
        <DialogContent className="sm:max-w-md">
          {gradeDialog && (
            <>
              <DialogHeader>
                <DialogTitle data-testid="dialog-grade-title">Grade Submission</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {gradeDialog.student?.name} — {gradeDialog.fileName}
                </p>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Grade (0-100)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={gradeValue}
                    onChange={e => setGradeValue(e.target.value)}
                    placeholder="Enter grade"
                    data-testid="input-grade"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Feedback (optional)</label>
                  <Textarea
                    value={feedbackValue}
                    onChange={e => setFeedbackValue(e.target.value)}
                    placeholder="Write feedback for the student..."
                    rows={3}
                    data-testid="input-feedback"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGradeDialog(null)}>Cancel</Button>
                <Button
                  className="bg-[#2563EB] hover:bg-[#2563EB]/90"
                  onClick={handleGrade}
                  disabled={gradeMutation.isPending}
                  data-testid="button-save-grade"
                >
                  {gradeMutation.isPending ? "Saving..." : "Save Grade"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={plagiarismDialog} onOpenChange={(open) => { setPlagiarismDialog(open); if (!open) setExpandedPair(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-plagiarism-title">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Plagiarism Analysis
            </DialogTitle>
          </DialogHeader>

          {plagiarismLoading && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {plagiarismResult && !plagiarismLoading && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Analyzed {plagiarismResult.totalSubmissions} submissions for text similarity.
                </p>
                {plagiarismResult.pairs.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => flagMutation.mutate(plagiarismResult.pairs)}
                    disabled={flagMutation.isPending}
                    data-testid="button-flag-notify"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {flagMutation.isPending ? "Sending..." : "Flag & Notify All Students"}
                  </Button>
                )}
              </div>

              {plagiarismResult.pairs.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium" data-testid="text-no-plagiarism">No Suspicious Similarities Found</p>
                  <p className="text-xs text-muted-foreground">All submissions appear to be independent work.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plagiarismResult.pairs.map((pair, i) => {
                    const isExpanded = expandedPair === i;
                    return (
                      <Card key={i} className={cn(
                        "transition-all",
                        pair.riskLevel === "high" && "border-red-300 bg-red-50/30",
                        pair.riskLevel === "medium" && "border-amber-300 bg-amber-50/30"
                      )}>
                        <CardContent className="pt-4 pb-3">
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setExpandedPair(isExpanded ? null : i)}
                            data-testid={`plag-pair-header-${i}`}
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-semibold">{pair.studentA.name}</span>
                              <span className="text-muted-foreground">↔</span>
                              <span className="font-semibold">{pair.studentB.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={pair.riskLevel === "high" ? "destructive" : "secondary"}
                                className={cn(
                                  "text-[11px] uppercase",
                                  pair.riskLevel === "medium" && "bg-amber-100 text-amber-700 border-amber-300"
                                )}
                                data-testid={`plag-risk-${i}`}
                              >
                                {pair.riskLevel} risk
                              </Badge>
                              <span className={cn(
                                "text-lg font-bold",
                                pair.similarity >= 50 ? "text-red-600" : pair.similarity >= 30 ? "text-amber-600" : "text-slate-600"
                              )} data-testid={`plag-similarity-${i}`}>
                                {pair.similarity}%
                              </span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </div>

                          {pair.matchingPassages.length > 0 && !isExpanded && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {pair.matchingPassages.length} matching passage{pair.matchingPassages.length !== 1 ? "s" : ""} found — click to expand
                            </p>
                          )}

                          {isExpanded && (
                            <div className="mt-4 space-y-4">
                              {pair.matchingPassages.length > 0 ? (
                                pair.matchingPassages.map((passage, pi) => (
                                  <div key={pi} className="space-y-2" data-testid={`plag-passage-${i}-${pi}`}>
                                    <div className="flex items-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                      <span className="text-xs font-semibold text-red-600">Copied Passage {pi + 1}</span>
                                    </div>
                                    <div className="rounded-lg border border-red-200 bg-white overflow-hidden">
                                      <div className="grid grid-cols-2 divide-x divide-red-200">
                                        <div className="p-3">
                                          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">{pair.studentA.name}</p>
                                          <p className="text-xs leading-relaxed text-slate-700">
                                            {renderHighlighted(passage.contextA || passage.text, passage.text)}
                                          </p>
                                        </div>
                                        <div className="p-3">
                                          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">{pair.studentB.name}</p>
                                          <p className="text-xs leading-relaxed text-slate-700">
                                            {renderHighlighted(passage.contextB || passage.text, passage.text)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                                  High structural similarity detected through n-gram analysis, but no exact matching sentences were found.
                                  This may indicate paraphrased copying.
                                </div>
                              )}

                              <div className="flex justify-end pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    flagMutation.mutate([pair]);
                                  }}
                                  disabled={flagMutation.isPending}
                                  data-testid={`button-flag-pair-${i}`}
                                >
                                  <Send className="w-3.5 h-3.5 mr-1.5" />
                                  {flagMutation.isPending ? "Sending..." : "Notify These Students"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
