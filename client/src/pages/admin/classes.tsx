import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen, Users, Trash2, Eye, GraduationCap, Copy, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

interface AdminClass {
  id: string;
  title: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  joinCode: string;
  createdAt: string;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  username: string;
  xp: number;
  level: number;
}

export default function AdminClasses() {
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<AdminClass | null>(null);
  const [viewStudentsClass, setViewStudentsClass] = useState<AdminClass | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: classes = [], isLoading } = useQuery<AdminClass[]>({
    queryKey: ["/api/admin/classes"],
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<StudentInfo[]>({
    queryKey: ["/api/classes", viewStudentsClass?.id, "students"],
    enabled: !!viewStudentsClass,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/classes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      toast({ title: "Class deleted", description: "The class has been removed." });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete class.", variant: "destructive" });
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Class Oversight"
        subtitle="View and manage all classes across teachers"
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Classes</p>
                  <p data-testid="text-total-classes" className="text-2xl font-bold text-foreground font-mono tabular-nums">{classes.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Students Enrolled</p>
                  <p data-testid="text-total-enrolled" className="text-2xl font-bold text-foreground font-mono tabular-nums">
                    {classes.reduce((sum, c) => sum + c.studentCount, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Unique Teachers</p>
                  <p data-testid="text-unique-teachers" className="text-2xl font-bold text-foreground font-mono tabular-nums">
                    {new Set(classes.map(c => c.teacherId)).size}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">All Classes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : classes.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No classes have been created yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-center">Students</TableHead>
                      <TableHead>Join Code</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((cls) => (
                      <TableRow key={cls.id} data-testid={`row-class-${cls.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-sm" data-testid={`text-class-title-${cls.id}`}>{cls.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{cls.subject}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-[10px]">{getInitials(cls.teacherName)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm" data-testid={`text-teacher-${cls.id}`}>{cls.teacherName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-mono" data-testid={`text-student-count-${cls.id}`}>{cls.studentCount}</span>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleCopyCode(cls.joinCode)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 rounded-md bg-muted hover-elevate cursor-pointer"
                            data-testid={`button-copy-code-${cls.id}`}
                          >
                            {copiedCode === cls.joinCode ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                            {cls.joinCode}
                          </button>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {cls.createdAt
                              ? formatDistanceToNow(new Date(cls.createdAt), { addSuffix: true })
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setViewStudentsClass(cls)}
                              data-testid={`button-view-students-${cls.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTarget(cls)}
                              data-testid={`button-delete-class-${cls.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewStudentsClass} onOpenChange={() => setViewStudentsClass(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enrolled Students</DialogTitle>
            <DialogDescription>
              Students in {viewStudentsClass?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {studentsLoading ? (
              <div className="space-y-3 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-md" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No students enrolled</p>
              </div>
            ) : (
              <div className="divide-y">
                {students.map((student) => (
                  <div key={student.id} data-testid={`row-student-${student.id}`} className="flex items-center gap-3 py-3 px-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">{getInitials(student.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-[10px]">Lv.{student.level}</Badge>
                      <span className="text-xs font-mono text-muted-foreground">{student.xp} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewStudentsClass(null)} data-testid="button-close-students">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone. All enrollments, sessions, and related data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 text-white"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
