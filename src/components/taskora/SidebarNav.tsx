import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  TrendingUp,
  Settings,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Schedule", url: "/schedule", icon: CalendarDays },
  { title: "Tasks", url: "/tasks", icon: ListChecks },
  { title: "Progress", url: "/progress", icon: TrendingUp },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function SidebarNav({
  onNavigate,
  onLogout,
}: {
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full flex-col gap-2 bg-sidebar p-4">
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="mb-4 flex items-center gap-3 px-2 py-1"
      >
        <span className="gradient-brand flex h-10 w-10 items-center justify-center rounded-xl shadow-soft">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          Taskora
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:translate-x-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4.5 w-4.5" />
        Logout
      </button>
    </div>
  );
}
