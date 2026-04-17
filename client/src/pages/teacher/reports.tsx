import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Download, Eye, Users, Trophy, Zap,
  Calendar, BookOpen, Brain, ChevronRight, AlertCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface ReportData {
  student: { id: string; name: string; email: string; xp: number; level: number; streakDays: number };
  sessionsTotal: number;
  sessionsAttended: number;
  avgAttention: number;
  xp: number;
  level: number;
  streakDays: number;
  badges: { id: string; label: string; badgeType: string; earnedAt: string }[];
  quizAttempts: { id: string; score: number; completedAt: string; quiz?: { title: string } }[];
  readingCompleted: number;
  className: string;
}

export default function TeacherReports() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [previewStudent, setPreviewStudent] = useState<string | null>(null);

  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({ queryKey: ["/api/classes"] });

  const selectedClassData = classes.find((c: any) => c.id === selectedClass);

  const { data: students = [], isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: ["/api/classes", selectedClass, "students"],
    enabled: !!selectedClass,
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<ReportData>({
    queryKey: ["/api/reports/student", previewStudent, "class", selectedClass],
    enabled: !!previewStudent && !!selectedClass,
  });

  function handleDownloadPdf(studentId: string) {
    window.open(`/api/reports/student/${studentId}/class/${selectedClass}/pdf`, "_blank");
  }

  function handleDownloadAll() {
    if (!students.length) return;
    students.forEach((s: any, i: number) => {
      setTimeout(() => {
        window.open(`/api/reports/student/${s.id}/class/${selectedClass}/pdf`, "_blank");
      }, i * 500);
    });
  }

  const attendanceRate = reportData && reportData.sessionsTotal > 0
    ? Math.round((reportData.sessionsAttended / reportData.sessionsTotal) * 100)
    : 0;

  const avgQuizScore = reportData && reportData.quizAttempts.length > 0
    ? Math.round(reportData.quizAttempts.reduce((s, a) => s + (a.score || 0), 0) / reportData.quizAttempts.length)
    : 0;

  return (
    <div className="flex-1 overflow-auto bg-[#F8FAFC]">
      <PageHeader title="Parent Reports" subtitle="Generate and review student progress reports" />

      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <p className="font-medium text-sm" data-testid="text-select-class-label">Select a class to generate reports</p>
                  <p className="text-xs text-muted-foreground">Reports include attendance, attention, XP, badges, and quiz scores</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[220px]" data-testid="select-class">
                    <SelectValue placeholder="Choose class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id} data-testid={`select-class-${c.id}`}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClass && students.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleDownloadAll}
                    className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90"
                    data-testid="button-download-all"
                  >
                    <Download className="w-4 h-4 mr-1" /> Download All
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {classesLoading && (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        )}

        {!selectedClass && !classesLoading && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Select a class above to see students and generate reports</p>
            </CardContent>
          </Card>
        )}

        {selectedClass && studentsLoading && (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        )}

        {selectedClass && !studentsLoading && students.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No students enrolled in this class yet</p>
            </CardContent>
          </Card>
        )}

        {selectedClass && students.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {students.length} Student{students.length !== 1 ? "s" : ""} in {selectedClassData?.title || "Class"}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {students.map((student: any) => (
                <Card key={student.id} className="hover:shadow-md transition-shadow" data-testid={`card-student-${student.id}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white font-semibold text-sm">
                          {student.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm" data-testid={`text-student-name-${student.id}`}>{student.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Zap className="w-3 h-3 mr-0.5" /> {student.xp} XP
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Lvl {student.level}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewStudent(student.id)}
                          data-testid={`button-preview-${student.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownloadPdf(student.id)}
                          className="bg-[#2563EB] hover:bg-[#2563EB]/90"
                          data-testid={`button-download-${student.id}`}
                        >
                          <Download className="w-4 h-4 mr-1" /> PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!previewStudent} onOpenChange={(open) => !open && setPreviewStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#2563EB]" />
              Report Preview
            </DialogTitle>
          </DialogHeader>

          {reportLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : reportData ? (
            <div className="space-y-5 py-2">
              <div className="bg-[#1E3A5F] rounded-lg p-5 text-white">
                <h2 className="text-xl font-bold" data-testid="text-report-student-name">{reportData.student.name}</h2>
                <p className="text-sm text-blue-200 mt-1">{reportData.className}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-blue-100">
                  <span className="flex items-center gap-1"><Trophy className="w-4 h-4" /> Level {reportData.level}</span>
                  <span className="flex items-center gap-1"><Zap className="w-4 h-4" /> {reportData.xp} XP</span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {reportData.streakDays}-day streak</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox
                  label="Sessions Attended"
                  value={`${reportData.sessionsAttended}/${reportData.sessionsTotal}`}
                  icon={<Users className="w-4 h-4" />}
                  color="blue"
                />
                <StatBox
                  label="Avg Attention"
                  value={`${reportData.avgAttention}%`}
                  icon={<Brain className="w-4 h-4" />}
                  color={reportData.avgAttention >= 70 ? "green" : reportData.avgAttention >= 50 ? "yellow" : "red"}
                />
                <StatBox
                  label="Books Completed"
                  value={`${reportData.readingCompleted}`}
                  icon={<BookOpen className="w-4 h-4" />}
                  color="blue"
                />
                <StatBox
                  label="Avg Quiz Score"
                  value={reportData.quizAttempts.length > 0 ? `${avgQuizScore}%` : "N/A"}
                  icon={<FileText className="w-4 h-4" />}
                  color={avgQuizScore >= 70 ? "green" : avgQuizScore >= 50 ? "yellow" : "red"}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Brain className="w-4 h-4 text-[#2563EB]" /> Attendance
                </h4>
                <div className="flex items-center gap-3">
                  <Progress value={attendanceRate} className="h-2 flex-1" />
                  <span className="text-sm font-medium text-muted-foreground w-12 text-right">{attendanceRate}%</span>
                </div>
              </div>

              {reportData.quizAttempts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Quiz History</h4>
                  <div className="space-y-1.5">
                    {reportData.quizAttempts.slice(0, 6).map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between text-sm px-3 py-2 bg-muted/40 rounded" data-testid={`row-quiz-${attempt.id}`}>
                        <span className="font-medium">{(attempt as any).quiz?.title || "Quiz"}</span>
                        <div className="flex items-center gap-3">
                          <Badge variant={attempt.score >= 80 ? "default" : attempt.score >= 60 ? "secondary" : "destructive"} className="text-xs">
                            {attempt.score}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reportData.badges.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-amber-500" /> Badges ({reportData.badges.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {reportData.badges.slice(0, 12).map((badge) => (
                      <Badge key={badge.id} variant="outline" className="text-xs" data-testid={`badge-${badge.id}`}>
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t flex justify-end">
                <Button
                  onClick={() => previewStudent && handleDownloadPdf(previewStudent)}
                  className="bg-[#2563EB] hover:bg-[#2563EB]/90"
                  data-testid="button-download-preview-pdf"
                >
                  <Download className="w-4 h-4 mr-2" /> Download PDF Report
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-[#2563EB] bg-blue-50",
    green: "text-emerald-600 bg-emerald-50",
    yellow: "text-amber-600 bg-amber-50",
    red: "text-red-600 bg-red-50",
  };
  const cls = colorMap[color] || colorMap.blue;
  return (
    <div className="border rounded-lg p-3 text-center">
      <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${cls}`}>
        {icon}
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
