import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Maximize2,
  Minimize2,
  Send,
  Check,
  FileText,
  Link2,
  MessageSquare,
  Users,
  History,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { relativeTime } from "@/lib/taskora";
import { useAuth } from "@/hooks/use-auth";
import {
  ASSIGNMENT_TYPES,
  useChecklistMutations,
  useChecklists,
  useCommentMutations,
  useElementMutations,
  useElements,
  usePageMutations,
  usePages,
  useReferenceMutations,
  useReferences,
  useSendWorkspaceMessage,
  useUpdateWorkspace,
  useWorkspace,
  useWorkspaceActivity,
  useWorkspaceComments,
  useWorkspaceMembers,
  useWorkspaceMessages,
  useHeartbeat,
  type ElementType,
  type WorkspaceElement,
} from "@/hooks/use-studio";

export const Route = createFileRoute("/_app/studio/$workspaceId")({
  head: () => ({
    meta: [
      { title: "Taskora Studio — Kerjakan Tugas" },
      {
        name: "description",
        content:
          "Taskora Studio: ruang kerja untuk menulis, menyusun halaman, mengumpulkan referensi, berdiskusi, dan menyelesaikan tugas bersama.",
      },
      { property: "og:title", content: "Taskora Studio — Kerjakan Tugas" },
      {
        property: "og:description",
        content: "Tulis, kolaborasi, review, dan selesaikan tugas dalam satu ruang kerja.",
      },
    ],
  }),
  component: StudioPage,
});

const BLOCKS: { type: ElementType; label: string }[] = [
  { type: "heading", label: "Judul" },
  { type: "text", label: "Paragraf" },
  { type: "list", label: "Daftar Poin" },
  { type: "quote", label: "Kutipan" },
  { type: "code", label: "Kode" },
  { type: "image", label: "Gambar (URL)" },
  { type: "divider", label: "Pemisah" },
];

function StudioPage() {
  const { workspaceId } = useParams({ from: "/_app/studio/$workspaceId" });
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: workspace, isLoading } = useWorkspace(workspaceId);
  const updateWorkspace = useUpdateWorkspace(workspaceId);
  const { data: pages = [] } = usePages(workspaceId);
  const pageMut = usePageMutations(workspaceId);

  const [activePage, setActivePage] = useState<string | undefined>();
  const [focus, setFocus] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activePage && pages.length > 0) setActivePage(pages[0]!.id);
  }, [pages, activePage]);

  const { data: elements = [] } = useElements(workspaceId, activePage);
  const elementMut = useElementMutations(workspaceId);
  const { data: checklists = [] } = useChecklists(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  useHeartbeat(workspaceId, activePage ? "sedang menulis" : "membuka studio");

  const doneCount = checklists.filter((c) => c.is_done).length;
  const progress =
    checklists.length === 0 ? 0 : Math.round((doneCount / checklists.length) * 100);

  function exportMarkdown() {
    const lines: string[] = [`# ${workspace?.title ?? "Tugas"}`, ""];
    for (const p of pages) {
      lines.push(`## ${p.title}`, "");
      lines.push("_(buka halaman ini di Studio untuk isi lengkapnya)_", "");
    }
    lines.push("### Halaman aktif", "");
    for (const el of elements) lines.push(elementToMarkdown(el), "");
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(workspace?.title ?? "taskora").replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Hasil kerja diunduh");
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat studio…
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="card-surface p-10 text-center text-sm text-muted-foreground">
        Ruang kerja tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <header className="card-surface flex flex-wrap items-center gap-3 p-4">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate({ to: "/tasks" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <Input
            defaultValue={workspace.title}
            className="h-9 border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== workspace.title) {
                setSaving(true);
                updateWorkspace.mutate(
                  { title: e.target.value.trim() },
                  { onSettled: () => setSaving(false) },
                );
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Taskora Studio {saving ? "• menyimpan…" : "• tersimpan otomatis"}
          </p>
        </div>
        <Select
          value={workspace.assignment_type}
          onValueChange={(v) => updateWorkspace.mutate({ assignment_type: v })}
        >
          <SelectTrigger className="w-[190px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {ASSIGNMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.icon} {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="rounded-xl" onClick={() => setFocus((f) => !f)}>
          {focus ? <Minimize2 className="mr-1.5 h-4 w-4" /> : <Maximize2 className="mr-1.5 h-4 w-4" />}
          {focus ? "Keluar Focus" : "Focus Mode"}
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={exportMarkdown}>
          <Download className="mr-1.5 h-4 w-4" /> Export
        </Button>
      </header>

      <div
        className={
          focus
            ? "mx-auto max-w-3xl"
            : "grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_320px]"
        }
      >
        {/* pages */}
        {!focus && (
          <aside className="card-surface h-fit space-y-1 p-3">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Halaman
            </p>
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePage(p.id)}
                className={`w-full truncate rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  p.id === activePage ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                }`}
              >
                {p.title}
              </button>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl text-sm"
              onClick={() =>
                pageMut.create.mutate(pages.length, {
                  onSuccess: (id) => setActivePage(id),
                })
              }
            >
              <Plus className="mr-1.5 h-4 w-4" /> Halaman
            </Button>
            {pages.length > 1 && activePage && (
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl text-sm text-destructive hover:text-destructive"
                onClick={() =>
                  pageMut.remove.mutate(activePage, {
                    onSuccess: () => setActivePage(pages.find((p) => p.id !== activePage)?.id),
                  })
                }
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Hapus halaman
              </Button>
            )}
          </aside>
        )}

        {/* editor */}
        <section className="card-surface space-y-3 p-5">
          {activePage && (
            <Input
              key={activePage}
              defaultValue={pages.find((p) => p.id === activePage)?.title ?? ""}
              className="h-8 border-none bg-transparent px-0 text-sm font-medium text-muted-foreground shadow-none focus-visible:ring-0"
              onBlur={(e) =>
                pageMut.rename.mutate({ id: activePage, title: e.target.value || "Tanpa judul" })
              }
            />
          )}

          {elements.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada isi. Tambahkan blok pertamamu dengan tombol “+ Add” di bawah.
            </p>
          )}

          {elements.map((el, i) => (
            <ElementRow
              key={el.id}
              element={el}
              onSave={(content) => elementMut.update.mutate({ id: el.id, content })}
              onDelete={() => elementMut.remove.mutate(el.id)}
              onUp={i > 0 ? () => elementMut.move.mutate({ a: el, b: elements[i - 1]! }) : undefined}
              onDown={
                i < elements.length - 1
                  ? () => elementMut.move.mutate({ a: el, b: elements[i + 1]! })
                  : undefined
              }
            />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl" disabled={!activePage}>
                <Plus className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-2xl">
              {BLOCKS.map((b) => (
                <DropdownMenuItem
                  key={b.type}
                  onClick={() =>
                    elementMut.add.mutate({
                      pageId: activePage!,
                      type: b.type,
                      position: elements.length,
                    })
                  }
                >
                  {b.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        {/* side panel */}
        {!focus && (
          <aside className="card-surface p-3">
            <div className="mb-3 rounded-xl bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress tugas</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="mt-2 h-2" />
              {checklists.length > 0 && progress === 100 && (
                <p className="mt-2 text-center text-sm font-semibold text-primary">
                  Mission Completed 🎉
                </p>
              )}
            </div>

            <Tabs defaultValue="checklist">
              <TabsList className="grid w-full grid-cols-5 rounded-xl">
                <TabsTrigger value="checklist" className="rounded-lg px-0">
                  <Check className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="refs" className="rounded-lg px-0">
                  <Link2 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="comments" className="rounded-lg px-0">
                  <MessageSquare className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="team" className="rounded-lg px-0">
                  <Users className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-lg px-0">
                  <History className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="checklist" className="mt-3">
                <ChecklistPanel workspaceId={workspaceId} />
              </TabsContent>
              <TabsContent value="refs" className="mt-3">
                <ReferencePanel workspaceId={workspaceId} />
              </TabsContent>
              <TabsContent value="comments" className="mt-3">
                <CommentPanel workspaceId={workspaceId} currentUserId={user?.id} />
              </TabsContent>
              <TabsContent value="team" className="mt-3">
                <TeamPanel workspaceId={workspaceId} memberCount={members.length} />
              </TabsContent>
              <TabsContent value="activity" className="mt-3">
                <ActivityPanel workspaceId={workspaceId} />
              </TabsContent>
            </Tabs>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ element editor ----------------------------- */

function ElementRow({
  element,
  onSave,
  onDelete,
  onUp,
  onDown,
}: {
  element: WorkspaceElement;
  onSave: (content: WorkspaceElement["content"]) => void;
  onDelete: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = useState(
    element.type === "list"
      ? (element.content.items ?? []).join("\n")
      : element.type === "image"
        ? (element.content.url ?? "")
        : (element.content.text ?? ""),
  );

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  function change(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (element.type === "list") onSave({ items: next.split("\n").filter(Boolean) });
      else if (element.type === "image") onSave({ url: next, alt: element.content.alt ?? "" });
      else onSave({ ...element.content, text: next });
    }, 700);
  }

  return (
    <div className="group relative rounded-xl border border-transparent p-2 transition-colors hover:border-border">
      <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
        {onUp && (
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onUp}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDown && (
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onDown}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {element.type === "divider" ? (
        <hr className="my-3 border-border" />
      ) : element.type === "heading" ? (
        <Input
          value={value}
          onChange={(e) => change(e.target.value)}
          className="border-none bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
          placeholder="Judul bagian"
        />
      ) : element.type === "image" ? (
        <div className="space-y-2">
          <Input
            value={value}
            onChange={(e) => change(e.target.value)}
            placeholder="Tempel URL gambar…"
            className="rounded-xl"
          />
          {value && (
            <img
              src={value}
              alt={element.content.alt ?? "Ilustrasi tugas"}
              className="max-h-64 rounded-xl object-contain"
              loading="lazy"
            />
          )}
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => change(e.target.value)}
          rows={element.type === "text" ? 3 : 2}
          placeholder={
            element.type === "list"
              ? "Satu poin per baris"
              : element.type === "code"
                ? "Tulis kode…"
                : element.type === "quote"
                  ? "Kutipan…"
                  : "Tulis di sini…"
          }
          className={`resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0 ${
            element.type === "code"
              ? "rounded-xl bg-muted/60 px-3 py-2 font-mono text-sm"
              : element.type === "quote"
                ? "border-l-2 border-l-primary/40 pl-3 italic"
                : ""
          }`}
        />
      )}
    </div>
  );
}

function elementToMarkdown(el: WorkspaceElement): string {
  switch (el.type) {
    case "heading":
      return `## ${el.content.text ?? ""}`;
    case "list":
      return (el.content.items ?? []).map((i) => `- ${i}`).join("\n");
    case "quote":
      return `> ${el.content.text ?? ""}`;
    case "code":
      return "```\n" + (el.content.text ?? "") + "\n```";
    case "image":
      return `![${el.content.alt ?? ""}](${el.content.url ?? ""})`;
    case "divider":
      return "---";
    default:
      return el.content.text ?? "";
  }
}

/* --------------------------------- panels ---------------------------------- */

function ChecklistPanel({ workspaceId }: { workspaceId: string }) {
  const { data: items = [] } = useChecklists(workspaceId);
  const { add, toggle, remove } = useChecklistMutations(workspaceId);
  const [label, setLabel] = useState("");

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Pecah tugas menjadi langkah kecil agar lebih mudah selesai.
        </p>
      )}
      {items.map((c) => (
        <div key={c.id} className="group flex items-start gap-2 rounded-xl px-1 py-1.5">
          <Checkbox
            checked={c.is_done}
            onCheckedChange={(v) => toggle.mutate({ id: c.id, is_done: v === true })}
            className="mt-0.5"
          />
          <span className={`flex-1 text-sm ${c.is_done ? "text-muted-foreground line-through" : ""}`}>
            {c.label}
          </span>
          <button
            className="hidden text-muted-foreground group-hover:block"
            onClick={() => remove.mutate(c.id)}
            aria-label="Hapus langkah"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <form
        className="flex gap-2 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          add.mutate({ label: label.trim(), position: items.length });
          setLabel("");
        }}
      >
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Tambah langkah…"
          className="h-9 rounded-xl"
        />
        <Button size="icon" className="h-9 w-9 shrink-0 rounded-xl" type="submit">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function ReferencePanel({ workspaceId }: { workspaceId: string }) {
  const { data: refs = [] } = useReferences(workspaceId);
  const { add, remove } = useReferenceMutations(workspaceId);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="space-y-3">
      {refs.length === 0 && (
        <p className="text-xs text-muted-foreground">Kumpulkan sumber dan bahan bacaanmu.</p>
      )}
      {refs.map((r) => (
        <div key={r.id} className="group rounded-xl bg-muted/50 p-2.5">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.title}</p>
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-primary hover:underline"
                >
                  {r.url}
                </a>
              )}
            </div>
            <button
              className="hidden text-muted-foreground group-hover:block"
              onClick={() => remove.mutate(r.id)}
              aria-label="Hapus referensi"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          add.mutate({ title: title.trim(), url: url.trim() });
          setTitle("");
          setUrl("");
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul sumber"
          className="h-9 rounded-xl"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="h-9 rounded-xl"
        />
        <Button type="submit" variant="outline" className="w-full rounded-xl">
          Tambah Referensi
        </Button>
      </form>
    </div>
  );
}

function CommentPanel({
  workspaceId,
  currentUserId,
}: {
  workspaceId: string;
  currentUserId?: string;
}) {
  const { data: comments = [] } = useWorkspaceComments(workspaceId);
  const { add, resolve, remove } = useCommentMutations(workspaceId);
  const [text, setText] = useState("");

  return (
    <div className="space-y-3">
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground">Belum ada catatan review.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={c.avatar_url ?? undefined} alt={c.full_name} />
              <AvatarFallback>{c.full_name?.charAt(0) ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.full_name}</span> ·{" "}
                {relativeTime(c.created_at)}
              </p>
              <p className={`text-sm ${c.is_resolved ? "text-muted-foreground line-through" : ""}`}>
                {c.content}
              </p>
              <div className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                <button
                  className="hover:text-primary"
                  onClick={() => resolve.mutate({ id: c.id, is_resolved: !c.is_resolved })}
                >
                  {c.is_resolved ? "Buka lagi" : "Selesai"}
                </button>
                {c.user_id === currentUserId && (
                  <button className="hover:text-destructive" onClick={() => remove.mutate(c.id)}>
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          add.mutate({ content: text.trim() });
          setText("");
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          className="h-9 rounded-xl"
        />
        <Button size="icon" className="h-9 w-9 shrink-0 rounded-xl" type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function TeamPanel({ workspaceId, memberCount }: { workspaceId: string; memberCount: number }) {
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const { data: messages = [] } = useWorkspaceMessages(workspaceId);
  const send = useSendWorkspaceMessage(workspaceId);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const online = useMemo(
    () =>
      members.filter(
        (m) => Date.now() - new Date(m.last_active_at).getTime() < 3 * 60 * 1000,
      ).length,
    [members],
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {memberCount} anggota · {online} sedang aktif
      </p>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
              <AvatarFallback>{m.full_name?.charAt(0) ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.activity_note ?? "—"} · {relativeTime(m.last_active_at)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">Mulai diskusi tim di sini.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            <span className="font-medium">{msg.full_name}: </span>
            <span>{msg.content}</span>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          send.mutate(text.trim());
          setText("");
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pesan tim…"
          className="h-9 rounded-xl"
        />
        <Button size="icon" className="h-9 w-9 shrink-0 rounded-xl" type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function ActivityPanel({ workspaceId }: { workspaceId: string }) {
  const { data: items = [] } = useWorkspaceActivity(workspaceId);
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-xs text-muted-foreground">Belum ada aktivitas.</p>}
      {items.map((a) => (
        <p key={a.id} className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{a.full_name}</span> {a.action} ·{" "}
          {relativeTime(a.created_at)}
        </p>
      ))}
    </div>
  );
}
