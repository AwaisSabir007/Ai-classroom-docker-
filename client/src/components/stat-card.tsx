import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
}

export function StatCard({ title, value, subtitle, icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", trend }: StatCardProps) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground font-mono tabular-nums">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && (
              <div className={cn("flex items-center gap-1 mt-2", trend.value >= 0 ? "text-emerald-600" : "text-red-500")}>
                <span className="text-xs font-semibold">{trend.value >= 0 ? "+" : ""}{trend.value}%</span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
