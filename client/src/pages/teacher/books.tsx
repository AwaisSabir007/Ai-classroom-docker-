import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Trash2, Search, FileText, Tag, Upload, File, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const coverColors = [
  "#2563EB", "#7C3AED", "#0EA5E9", "#16A34A", "#D97706", "#DC2626", "#1E3A5F", "#0F766E",
];
const subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English", "History", "Geography", "Other"];

export default function TeacherBooks() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", subject: "", totalPages: "", tags: "", coverColor: coverColors[0] });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: books = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/books"] });

  const createBook = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/books", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Failed to create book");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/books"] });
      setCreateOpen(false);
      setForm({ title: "", subject: "", totalPages: "", tags: "", coverColor: coverColors[0] });
      setPdfFile(null);
      toast({ title: "Book added", description: "Book added to your library" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add book", variant: "destructive" }),
  });

  const deleteBook = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/books/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/books"] });
      toast({ title: "Book removed" });
    },
  });

  const filtered = books.filter((b: any) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.subject.toLowerCase().includes(search.toLowerCase())
  );

  const validateAndSetPdf = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please select a PDF file", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50MB", variant: "destructive" });
      return;
    }
    setPdfFile(file);
    if (!form.title) {
      const name = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      setForm(f => ({ ...f, title: name }));
    }
  }, [form.title, toast]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSetPdf(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetPdf(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.subject) return;

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("subject", form.subject);
    formData.append("totalPages", String(parseInt(form.totalPages) || 1));
    formData.append("tags", JSON.stringify(form.tags.split(",").map(t => t.trim()).filter(Boolean)));
    formData.append("coverColor", form.coverColor);
    if (pdfFile) formData.append("pdf", pdfFile);

    createBook.mutate(formData);
  }

  return (
    <div>
      <PageHeader
        title="Books & Materials"
        subtitle="Manage your library and reading assignments"
        actions={
          <Button size="sm" className="bg-[#2563EB] text-white" onClick={() => setCreateOpen(true)} data-testid="button-add-book">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Book
          </Button>
        }
      />

      <div className="p-6 space-y-5">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white"
            data-testid="input-search-books"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No books yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">Add books to your library and assign them to classes.</p>
            <Button className="bg-[#2563EB] text-white" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Your First Book
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((book: any) => (
              <div key={book.id} data-testid={`book-card-${book.id}`} className="group relative hover-elevate rounded-xl overflow-hidden border border-card-border bg-card">
                <div
                  className="h-32 flex items-center justify-center relative"
                  style={{ background: `linear-gradient(135deg, ${book.coverColor || "#2563EB"}, ${book.coverColor || "#2563EB"}88)` }}
                >
                  <BookOpen className="w-10 h-10 text-white/80" />
                  {book.pdfPath && (
                    <Badge className="absolute top-2 left-2 bg-white/90 text-blue-700 border-0 text-[10px] gap-1">
                      <File className="w-2.5 h-2.5" /> PDF
                    </Badge>
                  )}
                  <button
                    onClick={() => { if (confirm("Remove this book?")) deleteBook.mutate(book.id); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    data-testid={`delete-book-${book.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-foreground line-clamp-2 mb-1.5">{book.title}</p>
                  <Badge className="text-[10px] border-0 bg-muted text-muted-foreground mb-2">{book.subject}</Badge>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <FileText className="w-3 h-3" />
                    <span>{book.totalPages} pages</span>
                  </div>
                  {book.tags?.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {book.tags.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-blue-700">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Book to Library</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Upload PDF</Label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-pdf-file"
              />
              {pdfFile ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-emerald-800 truncate">{pdfFile.name}</p>
                    <p className="text-[10px] text-emerald-600">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center hover:bg-emerald-300"
                    data-testid="button-remove-pdf"
                  >
                    <X className="w-3 h-3 text-emerald-700" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragEnter={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                    dragging ? "border-blue-500 bg-blue-50" : "border-muted-foreground/25 hover:border-blue-400 hover:bg-blue-50/50"
                  )}
                  data-testid="button-upload-pdf"
                >
                  <Upload className={cn("w-8 h-8 mx-auto mb-2", dragging ? "text-blue-500" : "text-muted-foreground/50")} />
                  <p className="text-xs font-medium text-muted-foreground">
                    {dragging ? "Drop your PDF here" : "Click or drag PDF here"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">Max 50MB</p>
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Book Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Calculus: Early Transcendentals" data-testid="input-book-title" />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger data-testid="select-book-subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total Pages {pdfFile && <span className="text-[10px] text-muted-foreground">(auto-detected from PDF if left empty)</span>}</Label>
              <Input type="number" value={form.totalPages} onChange={e => setForm(f => ({ ...f, totalPages: e.target.value }))} placeholder="e.g. 200" data-testid="input-total-pages" />
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. calculus, derivatives" data-testid="input-tags" />
            </div>
            <div className="space-y-2">
              <Label>Cover Color</Label>
              <div className="flex gap-2 flex-wrap">
                {coverColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, coverColor: color }))}
                    className={cn("w-7 h-7 rounded-lg border-2 transition-all", form.coverColor === color ? "border-foreground scale-110" : "border-transparent")}
                    style={{ background: color }}
                    data-testid={`color-${color}`}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#2563EB] text-white" disabled={createBook.isPending || !form.title || !form.subject} data-testid="button-submit-book">
                {createBook.isPending ? "Uploading..." : "Add Book"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
