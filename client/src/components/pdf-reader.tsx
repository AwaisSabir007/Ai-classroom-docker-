import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfReaderProps {
  url: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onDocLoaded?: (numPages: number) => void;
  onComplete?: () => void;
  onPageTextExtracted?: (text: string) => void;
}

export function PdfReader({ url, currentPage, onPageChange, onDocLoaded, onComplete, onPageTextExtracted }: PdfReaderProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const pdfDocRef = useRef<any>(null);

  const onDocumentLoadSuccess = useCallback((pdf: any) => {
    setNumPages(pdf.numPages);
    setLoading(false);
    pdfDocRef.current = pdf;
    onDocLoaded?.(pdf.numPages);
  }, [onDocLoaded]);

  useEffect(() => {
    if (!pdfDocRef.current || !onPageTextExtracted) return;
    pdfDocRef.current.getPage(currentPage).then((page: any) => {
      page.getTextContent().then((content: any) => {
        const text = content.items.map((item: any) => item.str).join(" ");
        onPageTextExtracted(text.slice(0, 3000));
      });
    }).catch(() => {});
  }, [currentPage, onPageTextExtracted]);

  const progress = numPages ? (currentPage / numPages) * 100 : 0;

  return (
    <div className="flex flex-col" data-testid="pdf-reader">
      <div className="px-6 py-2 border-b flex items-center justify-between">
        <div className="flex-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {numPages ? `Page ${currentPage} of ${numPages} · ${Math.round(progress)}% complete` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-4">
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7"
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-10 text-center font-mono">
            {Math.round(scale * 100)}%
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7"
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-slate-50 border shadow-sm">
            <CardContent className="p-4 w-full flex justify-center overflow-auto max-h-[70vh]">
              <div className="m-auto">
                <Document
                  file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="p-8 w-full">
                    <Skeleton className="h-[600px] w-full rounded-lg" />
                  </div>
                }
                error={
                  <div className="p-12 text-center">
                    <p className="text-sm text-red-600 font-medium">Failed to load PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">The file may be corrupted or unavailable</p>
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  loading={
                    <div className="p-8 w-full">
                      <Skeleton className="h-[600px] w-full rounded-lg" />
                    </div>
                  }
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
                </Document>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <div className="flex items-center gap-2">
              {numPages && numPages <= 20 ? (
                Array.from({ length: numPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => onPageChange(i + 1)}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all",
                      i + 1 === currentPage ? "bg-primary w-5" : i + 1 < currentPage ? "bg-primary/40" : "bg-muted"
                    )}
                    data-testid={`page-dot-${i + 1}`}
                  />
                ))
              ) : (
                <span className="text-xs text-muted-foreground font-mono">
                  {currentPage} / {numPages || "..."}
                </span>
              )}
            </div>
            <Button
              className="bg-[#2563EB] text-white"
              onClick={() => {
                if (numPages && currentPage >= numPages) {
                  onComplete?.();
                } else {
                  onPageChange(Math.min(numPages || currentPage, currentPage + 1));
                }
              }}
              disabled={!numPages}
              data-testid="button-next-page"
            >
              {numPages && currentPage >= numPages ? "Complete" : "Next"} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
