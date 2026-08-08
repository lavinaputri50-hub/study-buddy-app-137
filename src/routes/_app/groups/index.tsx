import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Users, LogIn, Copy, DoorOpen } from "lucide-react";
import { toast } from "sonner";
import { useMyGroups, useGroupMutations } from "@/hooks/use-collab-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/groups/")({
  head: () => ({
    meta: [
      { title: "Study Groups — Taskora" },
      {
        name: "description",
        content:
          "Buat atau gabung study group Taskora, kelola anggota, tugas bersama, chat, dan study room kolaboratif.",
      },
      { property: "og:title", content: "Study Groups — Taskora" },
      { property: "og:description", content: "Belajar bareng lewat grup kolaborasi Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { data: groups = [], isLoading } = useMyGroups();
  const { create, join, leave } = useGroupMutations();
  const [openCreate, setOpenCreate] = useState(false);
  const [openJoin, setOpenJoin] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Study Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Belajar bareng: tugas bersama, chat, dan study room.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenJoin(true)}>
            <LogIn className="mr-2 h-4 w-4" /> Join Group
          </Button>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Buat Group
          </Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat grup…</p>
      ) : groups.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Belum ada study group</p>
          <p className="text-sm text-muted-foreground">
            Buat grup baru atau gabung dengan kode dari temanmu.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className="surface-card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{g.name}</h2>
                {g.role === "admin" && <Badge variant="secondary">Admin</Badge>}
              </div>
              <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {g.description || "Tanpa deskripsi"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {g.member_count} anggota
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono transition-colors hover:bg-accent"
                  onClick={() => {
                    void navigator.clipboard.writeText(g.code);
                    toast.success("Kode grup disalin");
                  }}
                >
                  {g.code} <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-auto flex gap-2 pt-2">
                <Button asChild className="flex-1">
                  <Link to="/groups/$groupId" params={{ groupId: g.id }}>
                    <DoorOpen className="mr-2 h-4 w-4" /> Open
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    leave.mutate(g.id, {
                      onSuccess: () => toast.success("Kamu keluar dari grup"),
                    })
                  }
                >
                  Keluar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Study Group</DialogTitle>
            <DialogDescription>Kode grup dibuat otomatis untuk mengundang teman.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="g-name">Nama grup</Label>
              <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-desc">Deskripsi</Label>
              <Textarea
                id="g-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!name.trim() || create.isPending}
              onClick={() =>
                create.mutate(
                  { name: name.trim(), description: description.trim() || null },
                  {
                    onSuccess: (d) => {
                      toast.success(`Grup dibuat. Kode: ${d.code}`);
                      setOpenCreate(false);
                      setName("");
                      setDescription("");
                    },
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              Buat Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openJoin} onOpenChange={setOpenJoin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Study Group</DialogTitle>
            <DialogDescription>Masukkan kode grup 6 karakter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="g-code">Kode grup</Label>
            <Input
              id="g-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono tracking-widest"
              maxLength={6}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={code.trim().length < 4 || join.isPending}
              onClick={() =>
                join.mutate(code, {
                  onSuccess: (g) => {
                    toast.success(`Bergabung ke ${g.name}`);
                    setOpenJoin(false);
                    setCode("");
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Gabung
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
