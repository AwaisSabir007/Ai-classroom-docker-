import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { Separator } from "@/components/ui/separator";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-3 px-6 h-14">
        <SidebarTrigger data-testid="button-sidebar-toggle" className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          <NotificationBell />
        </div>
      </div>
    </div>
  );
}
