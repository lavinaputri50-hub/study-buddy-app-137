import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Send, Target, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import {
  useRoom,
  useRoomComments,
  useRoomMembers,
  useRoomMutations,
} from "@/hooks/use-collab-data";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/rooms/$roomId")({
  head: () => ({
    meta: [
      { title: "Sesi Study Room — Taskora" },
      {
        name: "description",
        content:
          "Sesi belajar bersama dengan timer countdown, target hari ini, progres tiap anggota, dan kolom komentar real-time.",
      },
      { property: "og:title", content: "Sesi Study Room — Taskora" },
      { property: "og:description", content: "Fokus belajar bareng sampai Mission Completed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomSessionPage,
});

function initials(name?: string) {
  return (name ?? "A").slice(0, 2).toUpperCase();
}

function RoomSessionPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: room } = useRoom(roomId);
  const { data: members = [] } = useRoomMembers(roomId);
  const { data: comments = [] } = useRoomComments(roomId);
  const { join, setProgress, comment, complete } = useRoomMutations(roomId);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [myProgress, setMyProgress] = useState(0);
  const [text, setText] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);

  const me = members.find((m) => m.user_id === user?.id);
  const joined = !!me;

  useEffect(() => {
    if (user && room && !joined) join.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, room?.id, joined]);

  useEffect(() => {
    if (me) setMyProgress(me.progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  const endsAt = useMemo(() => {
    if (!room) return null;
    const start = new Date(`${room.room_date}T${room.start_time}`);
    return start.getTime() + room.duration_minutes * 60_000;
  }, [room]);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (secondsLeft === 0 && room && !room.is_completed) {
      setShowOverlay(true);
      complete.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (!room) {
    return <p className="text-sm text-muted-foreground">Memuat study room…</p>;
  }

  const mm = String(Math.floor((secondsLeft ?? 0) / 60)).padStart(2, "0");
  const ss = String((secondsLeft ?? 0) % 60).padStart(2, "0");
  const avgProgress =
    members.length === 0
      ? 0
      : Math.round(members.reduce((s, m) => s + m.progress, 0) / members.length);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/groups/$groupId" params={{ groupId: room.group_id }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Group
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="surface-card gradient-brand flex flex-col items-center gap-2 p-10 text-primary-foreground">
            <p className="text-sm opacity-90">{room.name}</p>
            <p className="font-mono text-6xl font-bold tabular-nums tracking-tight">
              {mm}:{ss}
            </p>
            <p className="text-xs opacity-80">
              {room.is_completed || secondsLeft === 0 ? "Sesi selesai" : "Sesi sedang berjalan"}
            </p>
          </div>

          <div className="surface-card space-y-2 p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Target className="h-4 w-4 text-primary" /> Target Hari Ini
            </h2>
            <p className="text-lg font-medium">{room.target}</p>
            {room.target_description && (
              <p className="text-sm text-muted-foreground">{room.target_description}</p>
            )}
          </div>

          <div className="surface-card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Progress Belajarku</h2>
              <span className="font-semibold text-primary">{myProgress}%</span>
            </div>
            <Slider
              value={[myProgress]}
              max={100}
              step={5}
              onValueChange={(v) => setMyProgress(v[0] ?? 0)}
              onValueCommit={(v) => setProgress.mutate(v[0] ?? 0)}
            />
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Membaca materi", value: 33 },
                { label: "Mengerjakan latihan", value: 66 },
                { label: "Merangkum", value: 100 },
              ].map((step) => (
                <Button
                  key={step.value}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMyProgress(step.value);
                    setProgress.mutate(step.value);
                  }}
                >
                  {step.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4 text-primary" /> Sedang Belajar ({members.length})
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Rata-rata progres {avgProgress}%</p>
            <div className="mt-4 space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                    <AvatarFallback className="text-[10px]">{initials(m.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium">{m.full_name}</span>
                      <span className="text-muted-foreground">{m.progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card flex h-[380px] flex-col p-0">
            <h2 className="border-b px-6 py-4 font-semibold">Komentar</h2>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {comments.length === 0 && (
                <p className="pt-12 text-center text-sm text-muted-foreground">
                  Bagikan progresmu di sini.
                </p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-xs font-semibold">{c.full_name}</p>
                  <p className="text-sm">{c.content}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const value = text.trim();
                if (!value) return;
                comment.mutate(value, { onError: (err) => toast.error(err.message) });
                setText("");
              }}
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Sudah selesai latihan 1–5…"
                aria-label="Komentar"
              />
              <Button type="submit" size="icon" disabled={!text.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md space-y-4 p-8 text-center">
            <div className="gradient-brand mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
              <Trophy className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-semibold">Mission Completed</h2>
            <p className="text-sm text-muted-foreground">
              Selamat! Target belajar hari ini telah selesai.
            </p>
            <dl className="grid grid-cols-2 gap-3 text-left text-sm">
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Total durasi</dt>
                <dd className="font-semibold">{room.duration_minutes} menit</dd>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Progress akhir</dt>
                <dd className="font-semibold">{myProgress}%</dd>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Penyelesaian grup</dt>
                <dd className="font-semibold">{avgProgress}%</dd>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Jumlah komentar</dt>
                <dd className="font-semibold">{comments.length}</dd>
              </div>
            </dl>
            <Button className="w-full" onClick={() => void navigate({ to: "/dashboard" })}>
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
