import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Flag, CheckCircle2, FileText } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/taskora/Badges";
import { useTasks } from "@/hooks/use-taskora-data";
import { formatDeadline } from "@/lib/taskora";

export const Route = createFileRoute("/_app/tasks/$taskId")({
  head: () => ({
    meta: [
      { title: "Detail Tugas — Taskora" },
      {
        name: "description",
        content:
          "Lihat detail lengkap tugas: deskripsi, deadline, prioritas, status penyelesaian, dan tanggal dibuat.",
      },
      { property: "og:title", content: "Detail Tugas — Taskora" },
      { property: "og:description", content: "Detail lengkap satu tugas di Taskora." },
    ],
  }),
  component: TaskDetailPage,
});

function TaskDetailPage() {
  const { taskId } = useParams({ from: "/_app/tasks/$taskId" });
  const { data: tasks = [], isLoading } = useTasks();
  const task = tasks.find((t) => t.id === taskId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Tasks
      </Link>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}

      {!isLoading && !task && (
        <div className="card-surface p-10 text-center text-sm text-muted-foreground">
          Tugas tidak ditemukan.
        </div>
      )}

      {task && (
        <article className="card-surface space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
            <div className="flex gap-2">
              <StatusBadge done={task.is_done} />
              <PriorityBadge priority={task.priority} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" /> Deskripsi
            </p>
            <p className="text-sm leading-relaxed">
              {task.description || "Tidak ada deskripsi."}
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail icon={CalendarClock} label="Deadline" value={formatDeadline(task.deadline)} />
            <Detail icon={Flag} label="Prioritas" value={task.priority} />
            <Detail
              icon={CheckCircle2}
              label="Status"
              value={task.is_done ? "Selesai" : "Belum Selesai"}
            />
            <Detail
              icon={CalendarClock}
              label="Tanggal Dibuat"
              value={new Date(task.created_at).toLocaleString("id-ID")}
            />
          </dl>
        </article>
      )}
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flag;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="mt-1 text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}
