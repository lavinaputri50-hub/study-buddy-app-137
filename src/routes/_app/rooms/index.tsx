import { createFileRoute, Link } from "@tanstack/react-router";
import { Timer, DoorOpen } from "lucide-react";
import { useAllRooms, useMyGroups } from "@/hooks/use-collab-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/rooms/")({
  head: () => ({
    meta: [
      { title: "Study Room — Taskora" },
      {
        name: "description",
        content:
          "Masuk study room Taskora untuk belajar bersama dengan timer countdown, target harian, progres anggota, dan komentar.",
      },
      { property: "og:title", content: "Study Room — Taskora" },
      { property: "og:description", content: "Belajar bareng dengan timer dan target harian." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const { data: rooms = [], isLoading } = useAllRooms();
  const { data: groups = [] } = useMyGroups();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Study Room</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Belajar bersama pada waktu yang sama dengan target yang jelas.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat room…</p>
      ) : rooms.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
          <Timer className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Belum ada study room</p>
          <p className="text-sm text-muted-foreground">
            Buat study room dari salah satu study group kamu.
          </p>
          <Button asChild variant="outline">
            <Link to="/groups">Buka Study Groups</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <div key={r.id} className="surface-card space-y-2 p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{r.name}</h2>
                {r.is_completed ? <Badge variant="secondary">Completed</Badge> : <Badge>Aktif</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {groups.find((g) => g.id === r.group_id)?.name ?? "Study Group"}
              </p>
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
                  <DoorOpen className="mr-2 h-4 w-4" /> Masuk Room
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
