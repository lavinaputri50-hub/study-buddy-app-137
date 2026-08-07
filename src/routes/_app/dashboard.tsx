import { createFileRoute, Link } from "@tanstack/react-router";
import { ListChecks, CheckCircle2, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PriorityBadge } from "@/components/taskora/Badges";
import { useProfile, useTasks, useTaskMutations } from "@/hooks/use-taskora-data";
import { computeStats, formatDeadline, isUrgent } from "@/lib/taskora";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Taskora — Ringkasan Belajar Harian" },
      {
        name: "description",
        content:
          "Lihat total tugas, tugas selesai, persentase progres, dan checklist deadline terdekat di dashboard Taskora.",
      },
      { property: "og:title", content: "Dashboard Taskora — Ringkasan Belajar Harian" },
      {
        property: "og:description",
        content: "Ringkasan tugas, progres, dan deadline terdekat kamu.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useProfile();
  const { data: tasks = [], isLoading } = useTasks();
  const { update } = useTaskMutations();
  const stats = computeStats(tasks);

  const upcoming = tasks
    .filter((t) => !t.is_done)
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))
    .slice(0, 6);

  const cards = [
    { label: "Total Tasks", value: stats.total, icon: ListChecks },
    { label: "Total Completed", value: stats.completed, icon: CheckCircle2 },
    { label: "Total Progress", value: `${stats.progress}%`, icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Hello, {profile?.full_name ?? "Student"} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ini ringkasan aktivitas belajarmu hari ini.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card-surface card-hover p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <card.icon className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Progress Keseluruhan</h2>
          <span className="text-sm font-medium text-primary">{stats.progress}%</span>
        </div>
        <Progress value={stats.progress} className="mt-3 h-3" />
        <p className="mt-2 text-xs text-muted-foreground">
          {stats.completed} dari {stats.total} tugas selesai
        </p>
      </div>

      <div className="card-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Deadline Terdekat</h2>
          <Link
            to="/tasks"
            className="flex items-center gap-1 text-sm text-primary transition-colors hover:underline"
          >
            Lihat semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Memuat tugas…</p>}
          {!isLoading && upcoming.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada tugas aktif. Tambahkan tugas pertamamu di halaman Tasks.
            </p>
          )}
          {upcoming.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-muted/60"
            >
              <Checkbox
                checked={task.is_done}
                onCheckedChange={(checked) =>
                  update.mutate({ id: task.id, is_done: checked === true })
                }
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDeadline(task.deadline)}
                  {isUrgent(task) && <span className="ml-2 text-destructive">• Mepet!</span>}
                </p>
              </div>
              <PriorityBadge priority={task.priority} />
            </div>
          ))}
        </div>
      </div>

      <div className="gradient-brand flex items-center gap-3 rounded-3xl p-6 text-primary-foreground shadow-soft">
        <Sparkles className="h-5 w-5 shrink-0" />
        <p className="font-medium">One task at a time. You're closer than you think.</p>
      </div>
    </div>
  );
}
