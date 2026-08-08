import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles, CheckCircle2, Clock, ListChecks, Timer } from "lucide-react";
import { useTasks } from "@/hooks/use-taskora-data";
import { useMyRoomHistory } from "@/hooks/use-collab-data";
import { computeStats, MOTIVATIONS } from "@/lib/taskora";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/progress")({
  head: () => ({
    meta: [
      { title: "Progress Belajar — Taskora" },
      {
        name: "description",
        content:
          "Pantau produktivitas belajar lewat grafik garis tugas selesai per hari, ringkasan statistik, total waktu belajar, dan riwayat study room.",
      },
      { property: "og:title", content: "Progress Belajar — Taskora" },
      { property: "og:description", content: "Statistik dan progres penyelesaian tugasmu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

const WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function ProgressPage() {
  const { data: tasks = [] } = useTasks();
  const { data: history = [] } = useMyRoomHistory();
  const stats = computeStats(tasks);

  const motivation = useMemo(
    () => MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]!,
    [],
  );

  // Tugas selesai per hari dalam 7 hari terakhir (berbasis data database).
  const lineData = useMemo(() => {
    const counts = new Array(7).fill(0) as number[];
    tasks
      .filter((t) => t.is_done)
      .forEach((t) => {
        const d = new Date(t.updated_at);
        const idx = (d.getDay() + 6) % 7; // 0 = Senin
        counts[idx] = (counts[idx] ?? 0) + 1;
      });
    return WEEK.map((day, i) => ({ day: day.slice(0, 3), total: counts[i] ?? 0 }));
  }, [tasks]);

  const totalStudyMinutes = history
    .filter((r) => r.is_completed)
    .reduce((s, r) => s + r.duration_minutes, 0);

  const circumference = 2 * Math.PI * 54;

  const cards = [
    { label: "Completed Tasks", value: stats.completed, icon: CheckCircle2 },
    { label: "Pending Tasks", value: stats.pending, icon: Clock },
    { label: "Total Tasks", value: stats.total, icon: ListChecks },
    {
      label: "Total Study Time",
      value: `${Math.floor(totalStudyMinutes / 60)}j ${totalStudyMinutes % 60}m`,
      icon: Timer,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ringkasan produktivitas belajarmu.</p>
      </header>

      <section className="surface-card flex flex-col items-center gap-4 p-8 sm:flex-row sm:justify-center sm:gap-10">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="54" className="fill-none stroke-muted" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="54"
              className="fill-none stroke-primary transition-all duration-700"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (circumference * stats.progress) / 100}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
            {stats.progress}%
          </span>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-sm text-muted-foreground">Progress Penyelesaian Tugas</p>
          <p className="text-3xl font-semibold">{stats.progress}%</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.completed} dari {stats.total} tugas selesai
          </p>
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="font-semibold">Statistik Tugas Mingguan</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Jumlah tugas yang diselesaikan per hari.
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Tugas selesai"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-5">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-semibold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </section>

      <section className="surface-card overflow-hidden">
        <h2 className="border-b px-6 py-4 font-semibold">Riwayat Study Room</h2>
        {history.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Belum pernah mengikuti study room.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Nama room</th>
                  <th className="px-6 py-3 font-medium">Tanggal</th>
                  <th className="px-6 py-3 font-medium">Durasi</th>
                  <th className="px-6 py-3 font-medium">Progress</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-3 font-medium">{r.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(r.room_date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{r.duration_minutes} menit</td>
                    <td className="px-6 py-3">{r.progress}%</td>
                    <td className="px-6 py-3">
                      {r.is_completed ? (
                        <Badge variant="secondary">Mission Completed</Badge>
                      ) : (
                        <Badge variant="outline">Incomplete</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface-card gradient-brand flex items-center gap-4 p-8 text-primary-foreground">
        <Sparkles className="h-7 w-7 shrink-0" />
        <p className="text-lg font-medium">{motivation}</p>
      </section>
    </div>
  );
}
