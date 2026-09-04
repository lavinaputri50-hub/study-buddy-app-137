import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Paperclip,
  Send,
  Trash2,
  Users,
  History,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useGroupMembers } from "@/hooks/use-collab-data";
import {
  getFileUrl,
  useSharedTask,
  useTaskActivity,
  useTaskAttachments,
  useTaskComments,
  useTaskMembers,
  useWorkspaceMutations,
} from "@/hooks/use-shared-task";
import { PriorityBadge } from "@/components/taskora/Badges";
import { ProgressBar, TaskStatusBadge } from "@/components/taskora/TaskStatusBadge";
import {
  averageProgress,
  effectiveStatus,
  fileKind,
  formatBytes,
  formatDeadline,
  relativeTime,
} from "@/lib/taskora";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/workspace/$taskId")({
  head: () => ({
    meta: [
      { title: "Task Workspace — Taskora" },
      {
        name: "description",
        content:
          "Kerjakan tugas kelompok bersama: buka file materi, perbarui progress, catat target, dan diskusi dengan anggota grup.",
      },
      { property: "og:title", content: "Task Workspace — Taskora" },
      {
        property: "og:description",
        content: "Ruang kerja kolaboratif untuk mengerjakan shared task bersama teman sekelas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspacePage,
});

function initials(name?: string) {
  return (name ?? "A").slice(0, 2).toUpperCase();
}

function WorkspacePage() {
  const { taskId } = Route.useParams();
  const { user } = useAuth();
  const { data: task } = useSharedTask(taskId);
  const { data: members = [] } = useTaskMembers(taskId);
  const { data: attachments = [] } = useTaskAttachments(taskId);
  const { data: comments = [] } = useTaskComments(taskId);
  const { data: activity = [] } = useTaskActivity(taskId);
  const { data: groupMembers = [] } = useGroupMembers(task?.group_id ?? "");
  const mutations = useWorkspaceMutations(taskId, task?.group_id);

  const isAdmin = groupMembers.some((m) => m.user_id === user?.id && m.role === "admin");
  const me = members.find((m) => m.user_id === user?.id);
  const overall = averageProgress(members.map((m) => m.progress ?? 0));
  const status = effectiveStatus(task?.status ?? "not_started", task?.deadline ?? null, overall);
  const completed = members.length > 0 && members.every((m) => (m.progress ?? 0) >= 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/groups/$groupId" params={{ groupId: task?.group_id ?? "" }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Group
        </Link>
      </Button>

      {completed && (
        <div className="surface-card flex items-center gap-3 border-success/30 bg-success/10 p-5">
          <PartyPopper className="h-6 w-6 text-success" />
          <div>
            <p className="font-semibold text-success">Mission Completed 🎉</p>
            <p className="text-sm text-muted-foreground">
              Semua anggota sudah menyelesaikan targetnya. Kerja bagus!
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr_1fr]">
        {/* ---------------------------- kiri: detail ---------------------------- */}
        <section className="space-y-4">
          <div className="surface-card space-y-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <TaskStatusBadge status={status} />
              {task && <PriorityBadge priority={task.priority} />}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{task?.title ?? "Memuat…"}</h1>
            {task?.description && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {task.description}
              </p>
            )}
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Deadline: <span className="font-medium text-foreground">{formatDeadline(task?.deadline ?? null)}</span>
              </p>
              {task?.target && (
                <p className="text-muted-foreground">
                  Target: <span className="font-medium text-foreground">{task.target}</span>
                </p>
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress keseluruhan</span>
                <span className="font-semibold text-primary">{overall}%</span>
              </div>
              <ProgressBar value={overall} />
            </div>
          </div>

          <AttachmentsCard
            taskId={taskId}
            attachments={attachments}
            canUpload={!!me || isAdmin}
            isAdmin={isAdmin}
            mutations={mutations}
          />
        </section>

        {/* --------------------------- tengah: kerjakan -------------------------- */}
        <section className="space-y-4">
          <MyWorkCard me={me} mutations={mutations} target={task?.target ?? null} />
          <div className="surface-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-primary" /> Activity History
            </p>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="font-medium">{a.full_name}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                    <span className="block text-xs text-muted-foreground">
                      {relativeTime(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ------------------------ kanan: members + komentar -------------------- */}
        <section className="space-y-4">
          <div className="surface-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" /> Members ({members.length})
            </p>
            <div className="space-y-4">
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada yang mengerjakan.</p>
              )}
              {members.map((m) => {
                const st = effectiveStatus(m.status, task?.deadline ?? null, m.progress ?? 0);
                return (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                        <AvatarFallback className="text-[10px]">
                          {initials(m.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {m.full_name}
                      </span>
                      <TaskStatusBadge status={st} />
                      {isAdmin && m.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => mutations.removeMember.mutate(m.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={m.progress ?? 0} className="h-2" />
                      <span className="w-10 text-right text-xs text-muted-foreground">
                        {m.progress ?? 0}%
                      </span>
                    </div>
                    {m.note && <p className="text-xs text-muted-foreground">“{m.note}”</p>}
                  </div>
                );
              })}
            </div>
            {!me && (
              <Button
                className="mt-4 w-full"
                onClick={() =>
                  mutations.join.mutate(undefined, {
                    onSuccess: () => toast.success("Kamu bergabung mengerjakan task ini"),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                Ikut Mengerjakan
              </Button>
            )}
            {isAdmin && (
              <AddMembersRow
                groupMembers={groupMembers.map((g) => ({ id: g.user_id, name: g.full_name ?? "Anggota" }))}
                existing={members.map((m) => m.user_id)}
                onAdd={(ids) =>
                  mutations.addMembers.mutate(ids, {
                    onSuccess: () => toast.success("Anggota ditambahkan"),
                    onError: (e) => toast.error(e.message),
                  })
                }
              />
            )}
          </div>

          <CommentsCard comments={comments} onSend={(c) => mutations.comment.mutate(c)} />
        </section>
      </div>
    </div>
  );
}

/* -------------------------------- attachments ------------------------------- */

function AttachmentsCard({
  attachments,
  canUpload,
  isAdmin,
  mutations,
}: {
  taskId: string;
  attachments: ReturnType<typeof useTaskAttachments>["data"] extends infer T ? NonNullable<T> : never;
  canUpload: boolean;
  isAdmin: boolean;
  mutations: ReturnType<typeof useWorkspaceMutations>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  async function open(path: string, download?: string) {
    try {
      const url = await getFileUrl(path);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = download;
        a.click();
      } else {
        window.open(url, "_blank", "noopener");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="surface-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="h-4 w-4 text-primary" /> File Tugas
        </p>
        {canUpload && (
          <>
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              Upload
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                mutations.upload.mutate(file, {
                  onSuccess: () => toast.success("File diunggah"),
                  onError: (err) => toast.error(err.message),
                });
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada file yang diunggah.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-semibold text-primary">
                {fileKind(f.file_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(f.file_size)} · {f.full_name} · {relativeTime(f.created_at)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => open(f.file_path)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => open(f.file_path, f.file_name)}>
                <Download className="h-4 w-4" />
              </Button>
              {(isAdmin || f.uploaded_by === user?.id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => mutations.removeAttachment.mutate(f)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------- my work --------------------------------- */

function MyWorkCard({
  me,
  mutations,
  target,
}: {
  me: { progress: number; note: string | null } | undefined;
  mutations: ReturnType<typeof useWorkspaceMutations>;
  target: string | null;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const value = progress ?? me?.progress ?? 0;
  const noteValue = note ?? me?.note ?? "";

  if (!me) {
    return (
      <div className="surface-card p-5 text-sm text-muted-foreground">
        <FileText className="mb-2 h-5 w-5 text-primary" />
        Bergabunglah ke task ini untuk mulai mencatat progress kamu.
      </div>
    );
  }

  return (
    <div className="surface-card space-y-4 p-5">
      <p className="text-sm font-semibold">Pekerjaan Saya</p>
      {target && <p className="text-xs text-muted-foreground">Target: {target}</p>}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress saya</span>
          <span className="font-semibold text-primary">{value}%</span>
        </div>
        <Slider
          value={[value]}
          max={100}
          step={5}
          onValueChange={(v) => setProgress(v[0] ?? 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ws-note">Catatan</Label>
        <Textarea
          id="ws-note"
          rows={3}
          placeholder="Sudah sampai mana pekerjaanmu?"
          value={noteValue}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={mutations.setProgress.isPending}
          onClick={() =>
            mutations.setProgress.mutate(
              { progress: value, note: noteValue || null },
              {
                onSuccess: () => toast.success("Progress diperbarui"),
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          Simpan Progress
        </Button>
        <Button
          variant="outline"
          disabled={mutations.setProgress.isPending}
          onClick={() =>
            mutations.setProgress.mutate(
              { progress: 100, note: noteValue || null },
              {
                onSuccess: () => toast.success("Target ditandai selesai 🎉"),
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          Tandai Selesai
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------- comments --------------------------------- */

function CommentsCard({
  comments,
  onSend,
}: {
  comments: { id: string; full_name?: string; avatar_url?: string | null; content: string; created_at: string }[];
  onSend: (content: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="surface-card flex h-[420px] flex-col">
      <p className="border-b px-5 py-3 text-sm font-semibold">Comments</p>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada diskusi. Mulai sekarang!</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={c.avatar_url ?? undefined} alt={c.full_name} />
              <AvatarFallback className="text-[10px]">{initials(c.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {c.full_name}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {relativeTime(c.created_at)}
                </span>
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {c.content}
              </p>
            </div>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (!v) return;
          onSend(v);
          setText("");
        }}
      >
        <Input
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" size="icon" disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------- add members -------------------------------- */

function AddMembersRow({
  groupMembers,
  existing,
  onAdd,
}: {
  groupMembers: { id: string; name: string }[];
  existing: string[];
  onAdd: (ids: string[]) => void;
}) {
  const available = groupMembers.filter((g) => !existing.includes(g.id));
  if (available.length === 0) return null;
  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">Tambah anggota ke task</p>
      <div className="flex flex-wrap gap-2">
        {available.map((g) => (
          <Badge
            key={g.id}
            variant="outline"
            className="cursor-pointer rounded-full hover:bg-accent"
            onClick={() => onAdd([g.id])}
          >
            + {g.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
