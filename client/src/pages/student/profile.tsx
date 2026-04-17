import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  Trophy, Flame, Star, Zap, Brain, BookOpen, CheckCircle,
  Award, Clock, TrendingUp, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const xpThresholds = [0, 100, 250, 500, 900, 1400, 2000, 2700, 3500, 4400, 5500];
function getLevelProgress(xp: number, level: number) {
  const current = xpThresholds[level - 1] || 0;
  const next = xpThresholds[level] || xpThresholds[level - 1] + 1000;
  const progress = ((xp - current) / (next - current)) * 100;
  return { progress: Math.min(100, Math.max(0, progress)), needed: next - xp };
}

const badgeIcons: Record<string, { icon: any; color: string; bg: string }> = {
  first_chapter: { icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
  week_streak: { icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
  perfect_quiz: { icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  speed_reader: { icon: Zap, color: "text-purple-600", bg: "bg-purple-50" },
  top_attentive: { icon: Brain, color: "text-emerald-600", bg: "bg-emerald-50" },
  attendance: { icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
};

const allBadges = [
  { type: "first_chapter", label: "First Chapter", desc: "Complete your first chapter" },
  { type: "week_streak", label: "7-Day Streak", desc: "7 consecutive days of activity" },
  { type: "perfect_quiz", label: "Perfect Quiz", desc: "Score 100% on a quiz" },
  { type: "speed_reader", label: "Speed Reader", desc: "Complete a book in under 30 min" },
  { type: "top_attentive", label: "Top Attentive", desc: "Highest attention score in class" },
  { type: "attendance", label: "Perfect Attendance", desc: "Attend all sessions in a month" },
];

const learningStyleInfo: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  visual: { label: "Visual Learner", desc: "Learns best through diagrams, charts, and visual content", color: "text-blue-700", bg: "bg-blue-50" },
  auditory: { label: "Auditory Learner", desc: "Learns best through listening and verbal instructions", color: "text-amber-700", bg: "bg-amber-50" },
  reading: { label: "Reading/Writing Learner", desc: "Learns best through reading texts and note-taking", color: "text-emerald-700", bg: "bg-emerald-50" },
  kinetic: { label: "Kinetic Learner", desc: "Learns best through hands-on practice and movement", color: "text-purple-700", bg: "bg-purple-50" },
  mixed: { label: "Mixed Style", desc: "Adapts to multiple learning formats effectively", color: "text-slate-600", bg: "bg-slate-50" },
};

const activityData = [
  { day: "Mon", minutes: 45 }, { day: "Tue", minutes: 30 }, { day: "Wed", minutes: 60 },
  { day: "Thu", minutes: 15 }, { day: "Fri", minutes: 50 }, { day: "Sat", minutes: 35 }, { day: "Sun", minutes: 20 },
];

export default function StudentProfile() {
  const { user } = useAuth();
  const { data: analytics } = useQuery<any>({
    queryKey: [`/api/analytics/student/${user?.id}`],
    enabled: !!user?.id,
  });
  const { data: badges = [] } = useQuery<any[]>({ queryKey: ["/api/badges"] });

  const levelInfo = user ? getLevelProgress(user.xp, user.level) : null;
  const styleInfo = user?.learningStyle ? learningStyleInfo[user.learningStyle] : null;
  const earnedBadgeTypes = new Set(badges.map((b: any) => b.badgeType));

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your learning journey and achievements" />

      <div className="p-6 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-xl bg-[#1E3A5F] text-white font-bold">
                  {user ? getInitials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end mb-1">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-foreground">Level {user?.level}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{user?.xp} total XP</p>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress to Level {(user?.level || 1) + 1}</span>
                    <span className="font-semibold text-primary">{levelInfo?.needed} XP to go</span>
                  </div>
                  <Progress value={levelInfo?.progress || 0} className="h-2.5" />
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold">{user?.streakDays || 0} day streak</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">{badges.length} badges</span>
                  </div>
                  {styleInfo && (
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg", styleInfo.bg)}>
                      <Brain className={cn("w-3.5 h-3.5", styleInfo.color)} />
                      <span className={cn("text-xs font-semibold", styleInfo.color)}>{styleInfo.label}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Performance Stats</h3>
            {[
              { label: "Sessions Attended", value: analytics?.sessionsAttended || "—", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Books Completed", value: analytics?.readingCompleted || 0, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Avg. Attention", value: `${analytics?.avgAttention || 72}%`, icon: Brain, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Total XP", value: user?.xp || 0, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
            ].map(s => (
              <Card key={s.label} className="hover-elevate">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", s.bg)}>
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold font-mono">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Learning Style */}
            {styleInfo && (
              <Card className={cn("border-0", styleInfo.bg)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Brain className={cn("w-5 h-5 mt-0.5 flex-shrink-0", styleInfo.color)} />
                    <div>
                      <p className={cn("text-sm font-bold", styleInfo.color)}>{styleInfo.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{styleInfo.desc}</p>
                      {user?.styleConfidence && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Confidence</span>
                            <span className={cn("font-semibold", styleInfo.color)}>{Math.round((user.styleConfidence || 0) * 100)}%</span>
                          </div>
                          <Progress value={(user.styleConfidence || 0) * 100} className="h-1.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Weekly Activity */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Weekly Reading Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {activityData.map(d => {
                  const maxVal = Math.max(...activityData.map(a => a.minutes));
                  const pct = (d.minutes / maxVal) * 100;
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono">{d.minutes}m</span>
                      <div className="w-full rounded-t-md bg-[#EFF6FF] relative" style={{ height: "80px" }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-t-md bg-[#2563EB] transition-all"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{d.day}</span>
                    </div>
                  );
                })}
              </div>

              {/* Badges Grid */}
              <div className="mt-6">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Achievements</h4>
                <div className="grid grid-cols-3 gap-3">
                  {allBadges.map(badge => {
                    const earned = earnedBadgeTypes.has(badge.type);
                    const iconInfo = badgeIcons[badge.type] || { icon: Award, color: "text-muted-foreground", bg: "bg-muted" };
                    const IconComp = iconInfo.icon;
                    return (
                      <div
                        key={badge.type}
                        data-testid={`achievement-${badge.type}`}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                          earned ? `${iconInfo.bg} border-transparent` : "bg-muted/40 border-muted opacity-50"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", earned ? iconInfo.bg : "bg-muted")}>
                          <IconComp className={cn("w-4 h-4", earned ? iconInfo.color : "text-muted-foreground")} />
                        </div>
                        <p className="text-[10px] font-semibold leading-tight">{badge.label}</p>
                        {earned && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
