import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles } from "lucide-react";
import { useTasks } from "@/hooks/use-taskora-data";
import { computeStats, MOTIVATIONS } from "@/lib/taskora";

export const Route = createFileRoute("/_app/progress")({
  head: () => ({
    meta: [
      { title: "Progress Belajar — Taskora" },
      {
        name: "description",
        content:
          "Pantau produktivitas belajar lewat persentase penyelesaian tugas, grafik statistik, dan ringkasan tugas selesai maupun tertunda.",
      },
      { property: "og:title", content: "Progress Belajar — Taskora" },
      { property: "og:description", content: "Statistik dan progres penyelesaian tugasmu." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { data: tasks = [] } = useTasks();
  const stats = computeStats(tasks);

  const motivation = useMemo(
    () => MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]!,
    [],
  );

  const byPriority = (["high", "medium", "low"] as const).map((p) => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    total: tasks.filter((t) => t.priority === p).length,
  }));

  const donut = [
    { name: "Selesai", value: stats.completed },
    { name: "Belum Selesai", value: stats.pending },
  ];

  const circumference = 2 * Math.PI * 54;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ringkasan produktivitas belajarmu.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card-surface flex flex-col items-center justify-center p-6">
          <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="12" className="stroke-muted" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              className="stroke-primary transition-all duration-700"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - stats.progress / 100)}
            />
          </svg>
          <p className="-mt-28 text-4xl font-semibold">{stats.progress}%</p>
          <p className="mt-20 text-sm text-muted-foreground">Penyelesaian tugas</p>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-semibold">Statistik Tugas per Prioritas</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPriority}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
                <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Tugas Selesai", value: stats.completed },
            { label: "Tugas Belum Selesai", value: stats.pending },
            { label: "Total Tugas", value: stats.total },
          ].map((c) => (
            <div key={c.label} className="card-surface card-hover p-5">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="mt-2 text-3xl font-semibold">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="card-surface p-6">
          <h2 className="font-semibold">Selesai vs Belum</h2>
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  <Cell fill="var(--primary)" />
                  <Cell fill="var(--muted)" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="gradient-brand flex items-center gap-3 rounded-3xl p-6 text-primary-foreground shadow-soft">
        <Sparkles className="h-5 w-5 shrink-0" />
        <p className="font-medium">{motivation}</p>
      </div>
    </div>
  );
}
