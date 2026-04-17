import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Users, Play, Trash2, ChevronRight, Copy, Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const createClassSchema = z.object({
  title: z.string().min(2, "Class title must be at least 2 characters"),
  subject: z.string().min(1, "Subject is required"),
  scheduleTime: z.string().optional(),
  gamificationEnabled: z.boolean().default(true),
});
type CreateClassForm = z.infer<typeof createClassSchema>;

const subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English", "History", "Geography", "Art", "Music", "Other"];

const subjectColors: Record<string, string> = {
  Mathematics: "bg-blue-50 text-blue-600 border-blue-100",
  Physics: "bg-purple-50 text-purple-600 border-purple-100",
  Chemistry: "bg-orange-50 text-orange-600 border-orange-100",
  Biology: "bg-emerald-50 text-emerald-600 border-emerald-100",
  "Computer Science": "bg-indigo-50 text-indigo-600 border-indigo-100",
  English: "bg-pink-50 text-pink-600 border-pink-100",
  History: "bg-amber-50 text-amber-600 border-amber-100",
  default: "bg-muted text-muted-foreground border-border",
};

export default function TeacherClasses() {
  const [, setLocation] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: classes = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/classes"] });

  const form = useForm<CreateClassForm>({
    resolver: zodResolver(createClassSchema),
    defaultValues: { title: "", subject: "", scheduleTime: "", gamificationEnabled: true },
  });

  const createClass = useMutation({
    mutationFn: (data: CreateClassForm) => apiRequest("POST", "/api/classes", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/classes"] });
      setCreateOpen(false);
      form.reset();
      toast({ title: "Class created", description: "Students can now join with the class code" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create class", variant: "destructive" }),
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/classes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Class deleted" });
    },
  });

  const startSession = useMutation({
    mutationFn: ({ classId, title }: { classId: string; title: string }) =>
      apiRequest("POST", "/api/sessions", { classId, title }),
    onSuccess: (session: any) => {
      qc.invalidateQueries({ queryKey: ["/api/sessions"] });
      setLocation(`/teacher/session/${session.id}`);
    },
  });

  const filtered = classes.filter((c: any) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  );

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied!", description: `Join code ${code} copied to clipboard` });
  }

  return (
    <div>
      <PageHeader
        title="My Classes"
        subtitle="Manage your classes and students"
        actions={
          <Button size="sm" className="bg-[#2563EB] text-white" onClick={() => setCreateOpen(true)} data-testid="button-create-class">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Class
          </Button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search classes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white"
            data-testid="input-search-classes"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No classes yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">Create your first class and start inviting students with a unique join code.</p>
            <Button className="bg-[#2563EB] text-white" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Your First Class
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((cls: any) => {
              const colorClass = subjectColors[cls.subject] || subjectColors.default;
              return (
                <Card key={cls.id} className="hover-elevate cursor-pointer group" data-testid={`class-card-${cls.id}`}>
                  <CardContent className="p-0">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border", colorClass)}>
                          {cls.subject}
                        </div>
                        {cls.gamificationEnabled && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <Zap className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-semibold">XP Active</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-foreground mb-1 line-clamp-2">{cls.title}</h3>
                      {cls.scheduleTime && (
                        <p className="text-xs text-muted-foreground mb-3">{cls.scheduleTime}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-xs">{cls.studentCount || 0} students</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-card-border px-5 py-3 flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); copyCode(cls.joinCode); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/70 hover-elevate"
                        data-testid={`copy-code-${cls.id}`}
                      >
                        <span className="text-xs font-mono font-bold text-foreground">{cls.joinCode}</span>
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground"
                        onClick={e => { e.stopPropagation(); if (confirm("Delete this class?")) deleteClass.mutate(cls.id); }}
                        data-testid={`delete-class-${cls.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={e => { e.stopPropagation(); startSession.mutate({ classId: cls.id, title: `${cls.title} Session` }); }}
                        data-testid={`start-session-${cls.id}`}
                      >
                        <Play className="w-3 h-3 mr-1" /> Start
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-[#1E3A5F] text-white"
                        onClick={() => setLocation(`/teacher/classes/${cls.id}`)}
                        data-testid={`view-class-${cls.id}`}
                      >
                        View <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Class Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => createClass.mutate(d))} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Advanced Mathematics" data-testid="input-class-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-subject">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduleTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Mon/Wed/Fri 9:00 AM" data-testid="input-schedule" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gamificationEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 p-4">
                    <div>
                      <FormLabel className="text-sm font-semibold">Enable Gamification</FormLabel>
                      <p className="text-xs text-muted-foreground mt-0.5">XP, badges, and leaderboard for students</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-gamification" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#2563EB] text-white" disabled={createClass.isPending} data-testid="button-submit-class">
                  {createClass.isPending ? "Creating..." : "Create Class"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
