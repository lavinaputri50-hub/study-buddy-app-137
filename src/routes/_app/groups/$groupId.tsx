import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Send, Users, Timer, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  useGroup,
  useGroupMembers,
  useGroupMessages,
  useGroupRooms,
  useSendMessage,
  useSharedTaskMutations,
  useSharedTasks,
  useCreateRoom,
} from "@/hooks/use-collab-data";
import { useAuth } from "@/hooks/use-auth";
import { PriorityBadge, StatusBadge } from "@/components/taskora/Badges";
import { formatDeadline, type Priority } from "@/lib/taskora";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/groups/$groupId")({
  head: () => ({
    meta: [
      { title: "Detail Study Group — Taskora" },
      {
        name: "description",
        content:
          "Kelola tugas bersama, obrolan grup, dan study room kolaboratif di dalam study group Taskora.",
      },
      { property: "og:title", content: "Detail Study Group — Taskora" },
      { property: "og:description", content: "Tugas bersama, chat, dan study room satu tempat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupDetailPage,
});

function initials(name?: string) {
  return (name ?? "A").slice(0, 2).toUpperCase();
}

function GroupDetailPage() {
  const { groupId } = Route.useParams();
  const { user } = useAuth();
  const { data: group } = useGroup(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const isAdmin = members.some((m) => m.user_id === user?.id && m.role === "admin");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/groups">
          <ArrowLeft className="mr-2 h-4 w-4" /> Semua Group
        </Link>
      </Button>

      <header className="surface-card flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{group?.name ?? "Memuat…"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {group?.description || "Tanpa deskripsi"}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {members.length} anggota
            {group && (
              <button
                type="button"
                className="ml-2 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono hover:bg-accent"
                onClick={() => {
                  void navigator.clipboard.writeText(group.code);
                  toast.success("Kode grup disalin");
                }}
              >
                {group.code} <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex -space-x-2">
          {members.slice(0, 6).map((m) => (
            <Avatar key={m.id} className="h-9 w-9 border-2 border-card">
              <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
              <AvatarFallback>{initials(m.full_name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </header>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Shared Tasks</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="rooms">Study Room</TabsTrigger>
          <TabsTrigger value="members">Anggota</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <SharedTasksTab groupId={groupId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <ChatTab groupId={groupId} />
        </TabsContent>
        <TabsContent value="rooms" className="mt-4">
          <RoomsTab groupId={groupId} />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <div className="surface-card divide-y p-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                  <AvatarFallback>{initials(m.full_name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{m.full_name}</span>
                {m.role === "admin" && <Badge variant="secondary">Admin</Badge>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------- shared tasks ------------------------------ */

function SharedTasksTab({ groupId, isAdmin }: { groupId: string; isAdmin: boolean }) {
  const { data: tasks = [] } = useSharedTasks(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: progressMap = {} } = useGroupTaskProgress(groupId);
  const { remove } = useSharedTaskMutations(groupId);
  const create = useCreateSharedTask(groupId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    priority: "medium" as Priority,
    target: "",
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }),
    [tasks],
  );

  const overall = averageProgress(sorted.map((t) => progressMap[t.id]?.progress ?? 0));

  function reset() {
    setForm({ title: "", description: "", deadline: "", priority: "medium", target: "" });
    setPicked([]);
    setFiles([]);
  }

  return (
    <div className="space-y-4">
      <div className="surface-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress Grup</span>
          <span className="font-semibold text-primary">{overall}%</span>
        </div>
        <ProgressBar value={overall} className="mt-3" />
        <p className="mt-2 text-xs text-muted-foreground">
          {sorted.filter((t) => t.is_done).length} selesai · {sorted.length} shared task
        </p>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Shared Task
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="surface-card p-8 text-center text-sm text-muted-foreground">
          Belum ada tugas bersama.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((t) => {
            const p = progressMap[t.id]?.progress ?? 0;
            const status = effectiveStatus(t.status, t.deadline, p);
            return (
              <div key={t.id} className="surface-card space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/workspace/$taskId"
                    params={{ taskId: t.id }}
                    className="min-w-0 flex-1 font-medium hover:text-primary"
                  >
                    {t.title}
                  </Link>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                {t.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <TaskStatusBadge status={status} />
                  <PriorityBadge priority={t.priority} />
                  <span>{formatDeadline(t.deadline)}</span>
                </div>
                {t.target && <p className="text-xs text-muted-foreground">Target: {t.target}</p>}
                <div className="flex items-center gap-2">
                  <ProgressBar value={p} className="h-2" />
                  <span className="w-10 text-right text-xs text-muted-foreground">{p}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    <Users className="mr-1 inline h-3 w-3" />
                    {progressMap[t.id]?.members ?? 0} mengerjakan
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/workspace/$taskId" params={{ taskId: t.id }}>
                      Buka Workspace
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shared Task Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="st-title">Judul</Label>
              <Input
                id="st-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-desc">Deskripsi / Instruksi</Label>
              <Textarea
                id="st-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="st-deadline">Deadline</Label>
                <Input
                  id="st-deadline"
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as Priority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-target">Target pengerjaan</Label>
              <Input
                id="st-target"
                placeholder="Mis. soal 1-20 atau halaman 1-15"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-file">File tugas / materi</Label>
              <Input
                id="st-file"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground">{files.length} file dipilih</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Anggota yang ikut</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = picked.includes(m.user_id);
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() =>
                        setPicked((prev) =>
                          active ? prev.filter((id) => id !== m.user_id) : [...prev, m.user_id],
                        )
                      }
                      className={
                        active
                          ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
                      }
                    >
                      {m.full_name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!form.title.trim() || create.isPending}
              onClick={() =>
                create.mutate(
                  {
                    title: form.title.trim(),
                    description: form.description.trim() || null,
                    deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
                    priority: form.priority,
                    target: form.target.trim() || null,
                    memberIds: picked,
                    files,
                  },
                  {
                    onSuccess: () => {
                      toast.success("Shared task dibuat");
                      setOpen(false);
                      reset();
                    },
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              {create.isPending ? "Menyimpan…" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


/* ----------------------------------- chat ---------------------------------- */

function ChatTab({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { data: messages = [] } = useGroupMessages(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const send = useSendMessage(groupId);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const online = useMemo(() => members.slice(0, 3).map((m) => m.full_name), [members]);

  return (
    <div className="surface-card flex h-[520px] flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3 text-xs text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        {online.length > 0 ? `${online.join(", ")} sedang online` : "Belum ada anggota online"}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="pt-16 text-center text-sm text-muted-foreground">
            Mulai obrolan pertama di grup ini.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex gap-2"}>
              {!mine && (
                <Avatar className="mt-1 h-7 w-7">
                  <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                  <AvatarFallback className="text-[10px]">{initials(m.full_name)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={
                  mine
                    ? "max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground shadow-soft"
                    : "max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm"
                }
              >
                {!mine && <p className="mb-0.5 text-xs font-semibold">{m.full_name}</p>}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={mine ? "mt-1 text-[10px] opacity-70" : "mt-1 text-[10px] text-muted-foreground"}>
                  {new Date(m.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          if (!value) return;
          send.mutate(value, { onError: (err) => toast.error(err.message) });
          setText("");
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pesan…"
          aria-label="Pesan"
        />
        <Button type="submit" size="icon" disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

/* -------------------------------- study rooms ------------------------------ */

function RoomsTab({ groupId }: { groupId: string }) {
  const { data: rooms = [] } = useGroupRooms(groupId);
  const createRoom = useCreateRoom(groupId);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    room_date: new Date().toISOString().slice(0, 10),
    start_time: "19:00",
    duration_minutes: 60,
    target: "",
    target_description: "",
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Buat Study Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <p className="surface-card p-8 text-center text-sm text-muted-foreground">
          Belum ada study room di grup ini.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rooms.map((r) => (
            <div key={r.id} className="surface-card space-y-2 p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{r.name}</h3>
                {r.is_completed ? (
                  <Badge variant="secondary">Completed</Badge>
                ) : (
                  <Badge>Aktif</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">🎯 {r.target}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                {new Date(r.room_date).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                })}{" "}
                · {r.start_time.slice(0, 5)} · {r.duration_minutes} menit
              </p>
              <Button asChild className="w-full">
                <Link to="/rooms/$roomId" params={{ roomId: r.id }}>
                  Masuk Room
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Study Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="r-name">Nama Room</Label>
              <Input
                id="r-name"
                placeholder="Belajar Biologi"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="r-date">Tanggal</Label>
                <Input
                  id="r-date"
                  type="date"
                  value={form.room_date}
                  onChange={(e) => setForm({ ...form, room_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-time">Jam mulai</Label>
                <Input
                  id="r-time"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-dur">Durasi (menit)</Label>
                <Input
                  id="r-dur"
                  type="number"
                  min={5}
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm({ ...form, duration_minutes: Number(e.target.value) || 60 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-target">Target belajar</Label>
              <Input
                id="r-target"
                placeholder="Menyelesaikan Bab Sistem Respirasi"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-tdesc">Deskripsi target</Label>
              <Textarea
                id="r-tdesc"
                value={form.target_description}
                onChange={(e) => setForm({ ...form, target_description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!form.name.trim() || !form.target.trim() || createRoom.isPending}
              onClick={() =>
                createRoom.mutate(
                  {
                    ...form,
                    name: form.name.trim(),
                    target: form.target.trim(),
                    target_description: form.target_description.trim() || null,
                  },
                  {
                    onSuccess: (d) => {
                      toast.success("Study room dibuat");
                      setOpen(false);
                      void navigate({ to: "/rooms/$roomId", params: { roomId: d.id } });
                    },
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              Buat Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
