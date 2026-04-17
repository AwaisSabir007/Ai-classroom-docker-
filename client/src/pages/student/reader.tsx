import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FaceMonitor, CameraConsentDialog } from "@/components/face-monitor";
import { PdfReader } from "@/components/pdf-reader";
import {
  ChevronLeft, ChevronRight, BookOpen, Clock, Brain, Zap,
  X, Play, Youtube, Layout, HelpCircle, Lightbulb, Eye, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DoubtSolver } from "@/components/doubt-solver";

const samplePages = [
  { page: 1, content: "Chapter 1: Introduction to Calculus\n\nCalculus is the mathematical study of continuous change, in the same way that geometry is the study of shape, and algebra is the study of operations and their application to solving equations.\n\nIt has two major branches: differential calculus and integral calculus. These two branches are related to each other by the fundamental theorem of calculus.\n\nThe development of calculus is often attributed to two great mathematicians: Isaac Newton and Gottfried Wilhelm Leibniz, who worked independently in the late 17th century." },
  { page: 2, content: "1.1 Limits and Continuity\n\nThe concept of a limit is fundamental to calculus. A limit describes the value that a function approaches as its input approaches some value.\n\nFor a function f(x), we say the limit of f(x) as x approaches a is L, written:\nlim(x→a) f(x) = L\n\nThis means that f(x) can be made arbitrarily close to L by taking x sufficiently close to a (but not equal to a).\n\nA function is continuous at a point if the limit exists at that point and equals the function value." },
  { page: 3, content: "1.2 The Derivative\n\nThe derivative of a function at a point is the instantaneous rate of change of the function at that point. Geometrically, it represents the slope of the tangent line to the function's graph.\n\nThe derivative of f(x) is defined as:\nf'(x) = lim(h→0) [f(x+h) - f(x)] / h\n\nCommon derivative rules:\n• Power Rule: d/dx(xⁿ) = nxⁿ⁻¹\n• Sum Rule: d/dx[f(x) + g(x)] = f'(x) + g'(x)\n• Product Rule: d/dx[f(x)g(x)] = f'(x)g(x) + f(x)g'(x)" },
  { page: 4, content: "1.3 Integration\n\nIntegration is the reverse process of differentiation. The integral of a function represents the area under its curve.\n\nThe fundamental theorem of calculus connects differentiation and integration:\n∫[a to b] f(x)dx = F(b) - F(a)\n\nwhere F is any antiderivative of f.\n\nBasic integration rules:\n• Power Rule: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C\n• Constant Rule: ∫c dx = cx + C\n• Sum Rule: ∫[f(x) + g(x)]dx = ∫f(x)dx + ∫g(x)dx" },
];

const enrichmentCards = [
  { type: "video", icon: Youtube, title: "Khan Academy: Derivatives Explained", desc: "Watch a 5-minute visual explanation of derivatives", color: "bg-red-50 border-red-200" },
  { type: "diagram", icon: Layout, title: "Interactive Tangent Line", desc: "Drag points to visualize how derivatives change", color: "bg-blue-50 border-blue-200" },
  { type: "quiz", icon: HelpCircle, title: "Quick Check: Limits", desc: "3 quick questions to test your understanding", color: "bg-emerald-50 border-emerald-200" },
  { type: "fact", icon: Lightbulb, title: "Fun Fact", desc: "Newton and Leibniz discovered calculus independently within the same decade — and had a famous dispute about priority!", color: "bg-amber-50 border-amber-200" },
];

export default function StudentReader() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [numPdfPages, setNumPdfPages] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showEnrichment, setShowEnrichment] = useState(false);
  const [enrichmentType, setEnrichmentType] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [cameraConsent, setCameraConsent] = useState<boolean | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraWorking, setCameraWorking] = useState(false);
  const [attentionScore, setAttentionScore] = useState(78);
  const [pdfPageText, setPdfPageText] = useState<string>("");
  const timerRef = useRef<number | null>(null);
  const attentionRef = useRef<number | null>(null);
  const qc = useQueryClient();

  const { data: assignment } = useQuery<any>({
    queryKey: [`/api/assignments`],
    select: (data: any[]) => data?.find((a: any) => a.id === id),
  });

  const hasPdf = !!assignment?.book?.pdfPath;
  const pdfUrl = hasPdf ? `/api/books/${assignment.book.id}/pdf` : null;

  useEffect(() => {
    if (!assignment?.timerSeconds) return;
    setTimeLeft(assignment.timerSeconds);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t === null || t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [assignment]);

  useEffect(() => {
    if (cameraConsent !== false) return;
    attentionRef.current = window.setInterval(() => {
      const newScore = Math.min(100, Math.max(0, attentionScore + (Math.random() * 20 - 10)));
      setAttentionScore(Math.round(newScore));
      if (newScore < 45 && Math.random() > 0.7) {
        setShowEnrichment(true);
        setEnrichmentType(enrichmentCards[Math.floor(Math.random() * enrichmentCards.length)].type);
      }
    }, 5000);
    return () => { if (attentionRef.current) clearInterval(attentionRef.current); };
  }, [cameraConsent]);

  const handleCameraAnalysis = useCallback((data: { score: number; emotion: string }) => {
    setAttentionScore(data.score);
    if (data.score < 45 && Math.random() > 0.7) {
      setShowEnrichment(true);
      setEnrichmentType(enrichmentCards[Math.floor(Math.random() * enrichmentCards.length)].type);
    }
  }, []);

  const handleCameraConsent = useCallback((granted: boolean) => {
    setCameraConsent(granted);
    if (granted) setCameraActive(true);
  }, []);

  const handleCameraReady = useCallback(() => {
    setCameraWorking(true);
  }, []);

  const handleCameraFailed = useCallback(() => {
    setCameraWorking(false);
  }, []);

  const handlePdfLoaded = useCallback((pages: number) => {
    setNumPdfPages(pages);
  }, []);

  const handlePdfPageText = useCallback((text: string) => {
    setPdfPageText(text);
  }, []);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function nextPage() {
    const totalPages = hasPdf ? (numPdfPages || 1) : samplePages.length;
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
    else handleComplete();
  }

  function prevPage() {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  }

  function handleComplete() {
    setCompleted(true);
    setCameraActive(false);
    toast({ title: "+50 XP earned!", description: "You completed a reading assignment" });
  }

  const totalPages = hasPdf ? (numPdfPages || assignment?.book?.totalPages || 1) : (assignment?.book?.totalPages || samplePages.length);
  const progress = (currentPage / totalPages) * 100;
  const pageData = !hasPdf ? (samplePages[currentPage - 1] || samplePages[0]) : null;

  if (!assignment) {
    return (
      <div>
        <PageHeader title="Book Reader" />
        <div className="p-6 flex flex-col items-center justify-center py-20">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-semibold text-lg mb-1">Assignment not found</p>
          <Button variant="outline" onClick={() => setLocation("/student")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (cameraConsent === null) {
    return (
      <div>
        <PageHeader title={assignment.book?.title || "Book Reader"} />
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <CameraConsentDialog
            title="Enable AI Reading Monitor"
            onConsent={handleCameraConsent}
          />
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div>
        <PageHeader title="Reading Complete!" />
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <Zap className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold mb-1">Session Complete!</h2>
              <p className="text-sm text-muted-foreground mb-6">Great work on completing your reading</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-lg font-bold font-mono text-emerald-600">+50</p>
                  <p className="text-[10px] text-muted-foreground">XP Earned</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-lg font-bold font-mono">{currentPage}</p>
                  <p className="text-[10px] text-muted-foreground">Pages Read</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-lg font-bold font-mono text-blue-600">{attentionScore}%</p>
                  <p className="text-[10px] text-muted-foreground">Avg. Focus</p>
                </div>
              </div>
              <Button className="w-full bg-[#2563EB] text-white" onClick={() => setLocation("/student")} data-testid="button-back-dashboard">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={assignment.book?.title || "Book Reader"}
        subtitle={`${assignment.class?.title || ""} · Page ${currentPage} of ${totalPages}`}
        actions={
          <div className="flex items-center gap-3">
            {cameraActive && cameraWorking && (
              <Badge className="bg-red-50 text-red-600 border-0" data-testid="badge-camera-active">
                <Camera className="w-3 h-3 mr-1" /> Camera Active
              </Badge>
            )}
            {hasPdf && (
              <Badge className="bg-blue-50 text-blue-700 border-0 text-[10px]">
                PDF Reader
              </Badge>
            )}
            {(cameraConsent || cameraActive) && (
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                attentionScore >= 70 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              )}>
                <Brain className="w-3.5 h-3.5" />
                <span>{attentionScore}% focus</span>
              </div>
            )}
            {timeLeft !== null && (
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold",
                timeLeft < 300 ? "bg-red-50 text-red-600" : "bg-muted text-foreground"
              )}>
                <Clock className="w-3.5 h-3.5" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
        }
      />

      {hasPdf && pdfUrl ? (
        <PdfReader
          url={pdfUrl}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onDocLoaded={handlePdfLoaded}
          onComplete={handleComplete}
          onPageTextExtracted={handlePdfPageText}
        />
      ) : (
        <>
          <div className="px-6 py-2 border-b">
            <Progress value={progress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">{Math.round(progress)}% complete</p>
          </div>

          <div className="p-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="prose prose-sm max-w-none">
                  <div className="text-base leading-8 text-foreground whitespace-pre-line font-serif" data-testid="reader-content">
                    {pageData?.content}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={prevPage}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center gap-2">
                {samplePages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all",
                      i + 1 === currentPage ? "bg-primary w-5" : i + 1 < currentPage ? "bg-primary/40" : "bg-muted"
                    )}
                    data-testid={`page-dot-${i + 1}`}
                  />
                ))}
              </div>
              <Button
                className="bg-[#2563EB] text-white"
                onClick={nextPage}
                data-testid="button-next-page"
              >
                {currentPage === samplePages.length ? "Complete" : "Next"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {showEnrichment && (
        <div className="fixed bottom-6 right-6 w-80 z-40 animate-in slide-in-from-bottom-4">
          <Card className="border-2 border-[#2563EB] shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <p className="text-xs font-bold">Looks like you need a break!</p>
                </div>
                <button onClick={() => setShowEnrichment(false)} data-testid="button-dismiss-enrichment">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Try this enrichment content to re-engage:</p>
              <div className="space-y-2">
                {enrichmentCards.slice(0, 2).map(card => (
                  <button
                    key={card.type}
                    onClick={() => { setShowEnrichment(false); toast({ title: "Opening enrichment content..." }); }}
                    data-testid={`enrichment-${card.type}`}
                    className={cn("w-full flex items-start gap-3 p-3 rounded-xl border text-left hover-elevate", card.color)}
                  >
                    <card.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">{card.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{card.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <FaceMonitor
        active={cameraActive}
        onAnalysis={handleCameraAnalysis}
        onCameraReady={handleCameraReady}
        onCameraFailed={handleCameraFailed}
        intervalMs={5000}
        position="bottom-left"
        showScore={true}
      />

      <DoubtSolver
        bookTitle={assignment.book?.title}
        bookSubject={assignment.book?.subject}
        pageContent={hasPdf ? pdfPageText : pageData?.content}
      />
    </div>
  );
}
