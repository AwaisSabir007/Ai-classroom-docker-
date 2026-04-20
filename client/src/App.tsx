import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import TeacherDashboard from "@/pages/teacher/dashboard";
import TeacherClasses from "@/pages/teacher/classes";
import TeacherClassDetail from "@/pages/teacher/class-detail";
import TeacherSession from "@/pages/teacher/session";
import TeacherAnalytics from "@/pages/teacher/analytics";
import TeacherBooks from "@/pages/teacher/books";
import StudentDashboard from "@/pages/student/dashboard";
import StudentProfile from "@/pages/student/profile";
import StudentReader from "@/pages/student/reader";
import StudentQuiz from "@/pages/student/quiz";
import StudentSession from "@/pages/student/session";
import StudentTutor from "@/pages/student/tutor";
import TeacherQuizzes from "@/pages/teacher/quizzes";
import TeacherReports from "@/pages/teacher/reports";
import TeacherAIAdvisor from "@/pages/teacher/ai-advisor";
import TeacherPlagiarism from "@/pages/teacher/plagiarism";
import TeacherSubmissions from "@/pages/teacher/submissions";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminClasses from "@/pages/admin/classes";
import StudentMessages from "@/pages/student/messages";
import { Skeleton } from "@/components/ui/skeleton";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated && location !== "/login") {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) return null;

  if (location === "/login") return <LoginPage />;
  if (!user) return <LoginPage />;

  const defaultRoute = user.role === "teacher" ? "/teacher" : user.role === "admin" ? "/admin" : "/student";

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={() => <Redirect to={defaultRoute} />} />
        <Route path="/teacher" component={TeacherDashboard} />
        <Route path="/teacher/classes" component={TeacherClasses} />
        <Route path="/teacher/classes/:id" component={TeacherClassDetail} />
        <Route path="/teacher/session/:id" component={TeacherSession} />
        <Route path="/teacher/analytics" component={TeacherAnalytics} />
        <Route path="/teacher/books" component={TeacherBooks} />
        <Route path="/teacher/quizzes" component={TeacherQuizzes} />
        <Route path="/teacher/reports" component={TeacherReports} />
        <Route path="/teacher/ai-advisor" component={TeacherAIAdvisor} />
        <Route path="/teacher/plagiarism" component={TeacherPlagiarism} />
        <Route path="/teacher/submissions" component={TeacherSubmissions} />
        <Route path="/student" component={StudentDashboard} />
        <Route path="/student/quiz/:id" component={StudentQuiz} />
        <Route path="/student/session/:id" component={StudentSession} />
        <Route path="/student/messages" component={StudentMessages} />
        <Route path="/student/profile" component={StudentProfile} />
        <Route path="/student/reader/:id" component={StudentReader} />
        <Route path="/student/tutor/:id" component={StudentTutor} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/classes" component={AdminClasses} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGuard>
          <Router />
        </AuthGuard>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
