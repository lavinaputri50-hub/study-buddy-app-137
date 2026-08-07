import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge, StatusBadge } from "@/components/taskora/Badges";
import { TaskDialog } from "@/components/taskora/TaskDialog";
import { useTasks, useTaskMutations, type TaskInput } from "@/hooks/use-taskora-data";
import { formatDeadline, isUrgent, type Task } from "@/lib/taskora";

export const Route = createFileRoute("/_app/tasks/")({
  head: () => ({
    meta: [
      { title: "My Tasks — Taskora" },
      {
        name: "description",
        content:
          "Kelola daftar tugas kuliah dan sekolah: tambah, edit, hapus, dan tandai tugas selesai lengkap dengan prioritas dan deadline.",
      },
      { property: "og:title", content: "My Tasks — Taskora" },
      { property: "og:description", content: "CRUD tugas dengan prioritas dan deadline." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useTasks();
  const { create, update, remove } = useTaskMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  function handleSubmit(input: TaskInput) {
    const opts = {
      onSuccess: () => {
        setOpen(false);
        toast.success(editing ? "Tugas diperbarui" : "Tugas ditambahkan");
      },
      onError: () => toast.error("Gagal menyimpan tugas"),
    };
    if (editing) update.mutate({ id: editing.id, ...input }, opts);
    else create.mutate(input, opts);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">My Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.filter((t) => !t.is_done).length} tugas belum selesai
          </p>
        </div>
        <Button
          className="rounded-xl"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Tambah Tugas
        </Button>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat tugas…</p>}

      {!isLoading && tasks.length === 0 && (
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada tugas. Klik “Tambah Tugas” untuk memulai.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="card-surface card-hover flex items-center gap-4 p-4">
            <Checkbox
              checked={task.is_done}
              onCheckedChange={(checked) =>
                update.mutate({ id: task.id, is_done: checked === true })
              }
            />
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => navigate({ to: "/tasks/$taskId", params: { taskId: task.id } })}
            >
              <p
                className={`truncate font-medium ${task.is_done ? "text-muted-foreground line-through" : ""}`}
              >
                {task.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDeadline(task.deadline)}
                {isUrgent(task) && <span className="ml-2 text-destructive">• Deadline mepet</span>}
              </p>
            </button>

            <div className="hidden items-center gap-2 sm:flex">
              <StatusBadge done={task.is_done} />
              <PriorityBadge priority={task.priority} />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-lg">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl">
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/tasks/$taskId", params: { taskId: task.id } })}
                >
                  Detail Tugas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(task);
                    setOpen(true);
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() =>
                    remove.mutate(task.id, { onSuccess: () => toast.success("Tugas dihapus") })
                  }
                >
                  Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <TaskDialog
        open={open}
        onOpenChange={setOpen}
        task={editing}
        onSubmit={handleSubmit}
        pending={create.isPending || update.isPending}
      />
    </div>
  );
}
