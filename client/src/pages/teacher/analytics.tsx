import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell,
} from "recharts";
import { Brain, TrendingUp, Users, BookOpen, AlertTriangle, Video } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const weeklyData = [
  { week: "Week 1", attention: 72, sessions: 3 },
  { week: "Week 2", attention: 78, sessions: 4 },
  { week: "Week 3", attention: 69, sessions: 3 },
  { week: "Week 4", attention: 85, sessions: 5 },
  { week: "Week 5", attention: 81, sessions: 4 },
  { week: "Week 6", attention: 76, sessions: 4 },
];

const styleData = [
  { subject: "Visual", A: 65 },
  { subject: "Auditory", A: 42 },
  { subject: "Reading", A: 78 },
  { subject: "Kinetic", A: 35 },
  { subject: "Mixed", A: 50 },
];

const enrichmentData = [
  { type: "Video", engagement: 78, clicks: 145 },
  { type: "Diagram", engagement: 65, clicks: 89 },
  { type: "Quiz", engagement: 82, clicks: 167 },
  { type: "Fun Fact", engagement: 58, clicks: 73 },
];

const dropoutRisk = [
  { name: "Emma Rodriguez", risk: "high", attention: 41, sessions: 3, trend: -12 },
  { name: "Noah Williams", risk: "medium", attention: 58, sessions: 5, trend: -5 },
];

export default function TeacherAnalytics() {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/classes"] });
  const { data: analytics } = useQuery<any>({
    queryKey: [`/api/analytics/class/${selectedClass}`],
    enabled: selectedClass !== "all",
  });

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Performance insights across your classes"
        actions={
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-8 w-44 text-xs" data-testid="select-analytics-class">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Avg. Attention" value="78%" subtitle="All sessions" icon={Brain} iconColor="text-blue-600" iconBg="bg-blue-50" trend={{ value: 5, label: "vs last month" }} />
          <StatCard title="Total Sessions" value={analytics?.sessionCount ?? "—"} subtitle="Completed" icon={Video} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard title="Students" value={analytics?.studentCount ?? "—"} subtitle="Enrolled" icon={Users} iconColor="text-purple-600" iconBg="bg-purple-50" />
          <StatCard title="Boredom Events" value={analytics?.boredCount ?? 12} subtitle="This month" icon={AlertTriangle} iconColor="text-red-500" iconBg="bg-red-50" trend={{ value: -8, label: "vs last month" }} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Weekly Attention */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Weekly Attention Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #BFDBFE" }}
                    formatter={(v: number) => [`${v}%`, "Attention"]}
                  />
                  <Bar dataKey="attention" radius={[6, 6, 0, 0]}>
                    {weeklyData.map((entry, i) => (
                      <Cell key={i} fill={entry.attention >= 80 ? "#16A34A" : entry.attention >= 70 ? "#2563EB" : "#D97706"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Learning Style Distribution */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Learning Style Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={styleData} outerRadius={80}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar name="Students" dataKey="A" stroke="#2563EB" fill="#2563EB" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Enrichment Analytics */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Enrichment Content Effectiveness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrichmentData.map(e => (
                  <div key={e.type} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{e.type}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{e.clicks} clicks</span>
                        <span className="text-xs font-bold font-mono text-primary">{e.engagement}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${e.engagement}%`, background: e.engagement >= 75 ? "#16A34A" : e.engagement >= 60 ? "#2563EB" : "#D97706" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dropout Risk */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-orange-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Dropout Risk Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dropoutRisk.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">No at-risk students</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dropoutRisk.map(student => (
                    <div key={student.name} data-testid={`risk-student-${student.name.replace(/\s/g, "-").toLowerCase()}`} className={cn("p-3.5 rounded-xl border", student.risk === "high" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{student.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Avg attention: {student.attention}% · {student.sessions} sessions</p>
                        </div>
                        <Badge className={cn("text-[10px] border-0", student.risk === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                          {student.risk === "high" ? "High Risk" : "Medium Risk"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
                        <TrendingUp className="w-3 h-3 rotate-180" />
                        <span>Attention dropped {Math.abs(student.trend)}% over last 3 sessions</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
