import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchedules, useScheduleMutations, type ScheduleInput } from "@/hooks/use-taskora-data";
import { DAYS, formatTime, type Schedule } from "@/lib/taskora";

export const Route = createFileRoute("/_app/schedule")({
  head: () => ({
    meta: [
      { title: "Jadwal Mingguan — Taskora" },
      {
        name: "description",
        content:
          "Atur jadwal pelajaran mingguan Senin sampai Sabtu lengkap dengan mata pelajaran, jam mulai, dan jam selesai.",
      },
      { property: "og:title", content: "Jadwal Mingguan — Taskora" },
      { property: "og:description", content: "Kelola jadwal belajar Senin–Sabtu." },
    ],
  }),
  component: SchedulePage,
});

const EMPTY: ScheduleInput = { day_of_week: 0, subject: "", start_time: "08:00", end_time: "09:30" };

function SchedulePage() {
  const { data: schedules = [], isLoading } = useSchedules();
  const { create, update, remove } = useScheduleMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState<ScheduleInput>(EMPTY);

  function openCreate(day: number) {
    setEditing(null);
    setForm({ ...EMPTY, day_of_week: day });
    setOpen(true);
  }

  function openEdit(item: Schedule) {
    setEditing(item);
    setForm({
      day_of_week: item.day_of_week,
      subject: item.subject,
      start_time: formatTime(item.start_time),
      end_time: formatTime(item.end_time),
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const done = {
      onSuccess: () => {
        setOpen(false);
        toast.success(editing ? "Jadwal diperbarui" : "Jadwal ditambahkan");
      },
      onError: () => toast.error("Gagal menyimpan jadwal"),
    };
    if (editing) update.mutate({ id: editing.id, ...form }, done);
    else create.mutate(form, done);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">Jadwal pelajaran mingguan kamu.</p>
        </div>
        <Button className="rounded-xl" onClick={() => openCreate(0)}>
          <Plus className="mr-1.5 h-4 w-4" /> Tambah Jadwal
        </Button>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat jadwal…</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DAYS.map((day, index) => {
          const items = schedules.filter((s) => s.day_of_week === index);
          return (
            <div key={day} className="card-surface card-hover flex flex-col p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{day}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => openCreate(index)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex-1 space-y-2">
                {items.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Belum ada jadwal
                  </p>
                )}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-accent"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(item.start_time)}–{formatTime(item.end_time)}
                      </p>
                    </div>
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() =>
                          remove.mutate(item.id, {
                            onSuccess: () => toast.success("Jadwal dihapus"),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label>Hari</Label>
              <Select
                value={String(form.day_of_week)}
                onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, i) => (
                    <SelectItem key={day} value={String(i)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Mata Pelajaran</Label>
              <Input
                id="subject"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Matematika"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start">Waktu Mulai</Label>
                <Input
                  id="start"
                  type="time"
                  required
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Waktu Selesai</Label>
                <Input
                  id="end"
                  type="time"
                  required
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
