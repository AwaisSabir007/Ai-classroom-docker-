import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, Clock, File, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AssignmentSubmitProps {
  assignmentId: string;
}

export function AssignmentSubmit({ assignmentId }: AssignmentSubmitProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submission, isLoading } = useQuery<any>({
    queryKey: ["/api/assignments", assignmentId, "my-submission"],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${assignmentId}/my-submission`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/assignments", assignmentId, "my-submission"] });
      toast({ title: "Submitted!", description: "Your assignment has been submitted successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    },
  });

  function handleFile(file: File) {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file", description: "Only PDF and Word documents are accepted.", variant: "destructive" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 25MB.", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }

  if (isLoading) return null;

  if (submission) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800" data-testid="text-submission-status">Assignment Submitted</p>
              <p className="text-xs text-green-600 truncate" data-testid="text-submission-filename">{submission.fileName}</p>
            </div>
            {submission.grade !== null && submission.grade !== undefined ? (
              <Badge className="bg-[#2563EB] text-white" data-testid="text-submission-grade">
                {submission.grade}/100
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300" data-testid="text-submission-pending">
                <Clock className="w-3 h-3 mr-1" /> Pending
              </Badge>
            )}
          </div>
          {submission.feedback && (
            <div className="mt-3 p-2 rounded-md bg-white border text-xs text-muted-foreground" data-testid="text-submission-feedback">
              <span className="font-medium text-foreground">Feedback: </span>{submission.feedback}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-sm font-medium mb-2">Submit Assignment</p>
        {!selectedFile ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dragOver ? "border-[#2563EB] bg-blue-50" : "border-slate-200 hover:border-slate-300"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-submission"
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Drop your file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">PDF or Word (.docx) document (max 25MB)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              data-testid="input-submission-file"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-selected-filename">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)} data-testid="button-remove-file">
              <X className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="bg-[#2563EB] hover:bg-[#2563EB]/90"
              onClick={() => uploadMutation.mutate(selectedFile)}
              disabled={uploadMutation.isPending}
              data-testid="button-submit-assignment"
            >
              {uploadMutation.isPending ? "Uploading..." : "Submit"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
