import { useState } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Menu, Bell, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useProfile, useTasks } from "@/hooks/use-taskora-data";
import { SidebarNav } from "@/components/taskora/SidebarNav";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isUrgent, formatDeadline, relativeTime } from "@/lib/taskora";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/use-shared-task";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: () => (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  ),
});

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!loading && !session) {
    void navigate({ to: "/", replace: true });
  }

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarNav onLogout={() => setLogoutOpen(true)} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Menu Taskora</SheetTitle>
              <SidebarNav
                onNavigate={() => setMobileOpen(false)}
                onLogout={() => {
                  setMobileOpen(false);
                  setLogoutOpen(true);
                }}
              />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />
          <NotificationBell />
          <ProfileMenu onLogout={() => setLogoutOpen(true)} />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari Taskora?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin keluar dari akun Taskora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NotificationBell() {
  const { data: tasks = [] } = useTasks();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const urgent = tasks.filter(isUrgent);
  const unread = notifications.filter((n) => !n.is_read).length;
  const count = unread + urgent.length;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unread > 0) markRead.mutate();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-80 overflow-y-auto rounded-2xl">
        <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Belum ada notifikasi 🎉
          </p>
        )}
        {notifications.slice(0, 8).map((n) => (
          <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5">
            <span className={n.is_read ? "text-sm" : "text-sm font-medium"}>{n.message}</span>
            <span className="text-xs text-muted-foreground">{relativeTime(n.created_at)}</span>
          </DropdownMenuItem>
        ))}
        {urgent.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Deadline Mepet</DropdownMenuLabel>
            {urgent.slice(0, 6).map((task) => (
              <DropdownMenuItem key={task.id} className="flex-col items-start gap-0.5">
                <span className="text-sm font-medium">{task.title}</span>
                <span className="text-xs text-muted-foreground">
                  Deadline {formatDeadline(task.deadline)}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const name = profile?.full_name ?? "Student";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full ring-offset-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-9 w-9 border border-border">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={name} /> : null}
            <AvatarFallback className="bg-accent text-accent-foreground">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel className="flex flex-col">
          <span>{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
