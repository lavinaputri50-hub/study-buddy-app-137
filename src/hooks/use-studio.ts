import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/* --------------------------------- types --------------------------------- */

export type ElementType =
  | "heading"
  | "text"
  | "list"
  | "quote"
  | "code"
  | "divider"
  | "image";

export interface Workspace {
  id: string;
  owner_id: string;
  group_id: string | null;
  task_id: string | null;
  task_kind: string;
  title: string;
  assignment_type: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspacePage {
  id: string;
  workspace_id: string;
  title: string;
  position: number;
  speaker_notes: string | null;
}

export interface WorkspaceElement {
  id: string;
  workspace_id: string;
  page_id: string;
  type: string;
  content: { text?: string; items?: string[]; url?: string; alt?: string; lang?: string };
  position: number;
  created_by: string;
}

export interface WorkspaceChecklist {
  id: string;
  workspace_id: string;
  label: string;
  assignee_id: string | null;
  status: string;
  is_done: boolean;
  position: number;
}

export interface WorkspaceReference {
  id: string;
  workspace_id: string;
  added_by: string;
  kind: string;
  title: string;
  author: string | null;
  year: string | null;
  url: string | null;
  description: string | null;
  created_at: string;
}

export interface WorkspaceComment {
  id: string;
  workspace_id: string;
  element_id: string | null;
  user_id: string;
  content: string;
  is_resolved: boolean;
  created_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface WorkspaceMessage {
  id: string;
  workspace_id: string;
  user_id: string;
  content: string;
  created_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface WorkspaceActivity {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  created_at: string;
  full_name?: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  activity_note: string | null;
  focus_minutes: number;
  last_active_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export const ASSIGNMENT_TYPES = [
  { value: "essay", label: "Essay / Laporan", icon: "📝" },
  { value: "presentation", label: "Presentasi", icon: "📊" },
  { value: "note", label: "Catatan / Rangkuman", icon: "📒" },
  { value: "research", label: "Riset / Makalah", icon: "🔬" },
  { value: "problem_set", label: "Latihan Soal", icon: "🧮" },
  { value: "project", label: "Proyek Kelompok", icon: "🚀" },
] as const;

/* -------------------------------- helpers -------------------------------- */

async function withProfiles<T extends { user_id: string }>(rows: T[]) {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (ids.length === 0) return rows;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", ids);
  return rows.map((r) => ({
    ...r,
    full_name: profiles?.find((p) => p.id === r.user_id)?.full_name ?? "Anggota",
    avatar_url: profiles?.find((p) => p.id === r.user_id)?.avatar_url ?? null,
  }));
}

export async function logWorkspaceActivity(
  workspaceId: string,
  userId: string,
  action: string,
) {
  await supabase
    .from("workspace_activity")
    .insert({ workspace_id: workspaceId, user_id: userId, action });
}

/* ------------------------------ open studio ------------------------------ */

export interface OpenStudioInput {
  taskId: string;
  taskKind: "personal" | "shared";
  title: string;
  groupId?: string | null;
  assignmentType?: string;
}

/** Cari workspace milik sebuah task, buat baru jika belum ada. */
export function useOpenStudio() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OpenStudioInput): Promise<string> => {
      const { data: existing } = await supabase
        .from("workspaces")
        .select("id")
        .eq("task_id", input.taskId)
        .maybeSingle();
      if (existing?.id) return existing.id;

      const { data: ws, error } = await supabase
        .from("workspaces")
        .insert({
          owner_id: user!.id,
          group_id: input.groupId ?? null,
          task_id: input.taskId,
          task_kind: input.taskKind,
          title: input.title,
          assignment_type: input.assignmentType ?? "note",
        })
        .select("id")
        .single();
      if (error) throw error;

      const { data: page } = await supabase
        .from("workspace_pages")
        .insert({ workspace_id: ws.id, title: "Halaman 1", position: 0 })
        .select("id")
        .single();

      if (page) {
        await supabase.from("workspace_elements").insert([
          {
            workspace_id: ws.id,
            page_id: page.id,
            type: "heading",
            content: { text: input.title },
            position: 0,
            created_by: user!.id,
          },
          {
            workspace_id: ws.id,
            page_id: page.id,
            type: "text",
            content: { text: "Mulai tulis pengerjaan tugasmu di sini…" },
            position: 1,
            created_by: user!.id,
          },
        ]);
      }

      await supabase
        .from("workspace_members")
        .insert({ workspace_id: ws.id, user_id: user!.id, role: "owner" });
      await logWorkspaceActivity(ws.id, user!.id, "membuat workspace");
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      return ws.id;
    },
  });
}

/* ------------------------------- workspace -------------------------------- */

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ["workspace", id],
    queryFn: async (): Promise<Workspace | null> => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Workspace | null;
    },
  });
}

export function useUpdateWorkspace(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Workspace, "title" | "assignment_type">>) => {
      const { error } = await supabase.from("workspaces").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace", id] }),
  });
}

/* --------------------------------- pages ---------------------------------- */

export function usePages(workspaceId: string) {
  return useQuery({
    queryKey: ["ws-pages", workspaceId],
    queryFn: async (): Promise<WorkspacePage[]> => {
      const { data, error } = await supabase
        .from("workspace_pages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as WorkspacePage[];
    },
  });
}

export function usePageMutations(workspaceId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ws-pages", workspaceId] });

  const create = useMutation({
    mutationFn: async (position: number) => {
      const { data, error } = await supabase
        .from("workspace_pages")
        .insert({ workspace_id: workspaceId, title: `Halaman ${position + 1}`, position })
        .select("id")
        .single();
      if (error) throw error;
      await logWorkspaceActivity(workspaceId, user!.id, "menambah halaman baru");
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("workspace_pages").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("workspace_pages")
        .update({ speaker_notes: notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("workspace_elements").delete().eq("page_id", id);
      const { error } = await supabase.from("workspace_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, rename, setNotes, remove };
}

/* -------------------------------- elements -------------------------------- */

export function useElements(workspaceId: string, pageId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`ws-elements-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workspace_elements", filter: `workspace_id=eq.${workspaceId}` },
        () => qc.invalidateQueries({ queryKey: ["ws-elements", workspaceId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);

  return useQuery({
    queryKey: ["ws-elements", workspaceId, pageId],
    enabled: !!pageId,
    queryFn: async (): Promise<WorkspaceElement[]> => {
      const { data, error } = await supabase
        .from("workspace_elements")
        .select("*")
        .eq("page_id", pageId!)
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as WorkspaceElement[];
    },
  });
}

export function useElementMutations(workspaceId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ws-elements", workspaceId] });

  const add = useMutation({
    mutationFn: async ({
      pageId,
      type,
      position,
      content,
    }: {
      pageId: string;
      type: ElementType;
      position: number;
      content?: WorkspaceElement["content"];
    }) => {
      const { error } = await supabase.from("workspace_elements").insert({
        workspace_id: workspaceId,
        page_id: pageId,
        type,
        position,
        content: content ?? defaultContent(type),
        created_by: user!.id,
      });
      if (error) throw error;
      await logWorkspaceActivity(workspaceId, user!.id, `menambah blok ${type}`);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: WorkspaceElement["content"] }) => {
      const { error } = await supabase
        .from("workspace_elements")
        .update({ content })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const move = useMutation({
    mutationFn: async ({ a, b }: { a: WorkspaceElement; b: WorkspaceElement }) => {
      await supabase.from("workspace_elements").update({ position: b.position }).eq("id", a.id);
      await supabase.from("workspace_elements").update({ position: a.position }).eq("id", b.id);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_elements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, move, remove };
}

export function defaultContent(type: ElementType): WorkspaceElement["content"] {
  switch (type) {
    case "heading":
      return { text: "Judul bagian" };
    case "list":
      return { items: ["Poin pertama"] };
    case "quote":
      return { text: "Kutipan penting…" };
    case "code":
      return { text: "// tulis kode di sini", lang: "text" };
    case "image":
      return { url: "", alt: "" };
    case "divider":
      return {};
    default:
      return { text: "" };
  }
}

/* ------------------------------- checklists -------------------------------- */

export function useChecklists(workspaceId: string) {
  return useQuery({
    queryKey: ["ws-checklists", workspaceId],
    refetchInterval: 20000,
    queryFn: async (): Promise<WorkspaceChecklist[]> => {
      const { data, error } = await supabase
        .from("workspace_checklists")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as WorkspaceChecklist[];
    },
  });
}

export function useChecklistMutations(workspaceId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ws-checklists", workspaceId] });

  const add = useMutation({
    mutationFn: async ({ label, position }: { label: string; position: number }) => {
      const { error } = await supabase.from("workspace_checklists").insert({
        workspace_id: workspaceId,
        label,
        position,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase
        .from("workspace_checklists")
        .update({ is_done, status: is_done ? "done" : "todo" })
        .eq("id", id);
      if (error) throw error;
      await logWorkspaceActivity(
        workspaceId,
        user!.id,
        is_done ? "menyelesaikan satu checklist" : "membuka kembali satu checklist",
      );
    },
    onSuccess: invalidate,
  });

  const assign = useMutation({
    mutationFn: async ({ id, assignee_id }: { id: string; assignee_id: string | null }) => {
      const { error } = await supabase
        .from("workspace_checklists")
        .update({ assignee_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_checklists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, toggle, assign, remove };
}

/* ------------------------------- references -------------------------------- */

export function useReferences(workspaceId: string) {
  return useQuery({
    queryKey: ["ws-refs", workspaceId],
    queryFn: async (): Promise<WorkspaceReference[]> => {
      const { data, error } = await supabase
        .from("workspace_references")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkspaceReference[];
    },
  });
}

export function useReferenceMutations(workspaceId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ws-refs", workspaceId] });

  const add = useMutation({
    mutationFn: async (input: {
      title: string;
      author?: string;
      year?: string;
      url?: string;
      kind?: string;
    }) => {
      const { error } = await supabase.from("workspace_references").insert({
        workspace_id: workspaceId,
        added_by: user!.id,
        kind: input.kind ?? "link",
        title: input.title,
        author: input.author || null,
        year: input.year || null,
        url: input.url || null,
      });
      if (error) throw error;
      await logWorkspaceActivity(workspaceId, user!.id, "menambah referensi");
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_references").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, remove };
}

/* --------------------------------- comments -------------------------------- */

export function useWorkspaceComments(workspaceId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`ws-comments-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workspace_comments", filter: `workspace_id=eq.${workspaceId}` },
        () => qc.invalidateQueries({ queryKey: ["ws-comments", workspaceId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);

  return useQuery({
    queryKey: ["ws-comments", workspaceId],
    queryFn: async (): Promise<WorkspaceComment[]> => {
      const { data, error } = await supabase
        .from("workspace_comments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (await withProfiles((data ?? []) as WorkspaceComment[])) as WorkspaceComment[];
    },
  });
}

export function useCommentMutations(workspaceId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ws-comments", workspaceId] });

  const add = useMutation({
    mutationFn: async ({ content, elementId }: { content: string; elementId?: string | null }) => {
      const { error } = await supabase.from("workspace_comments").insert({
        workspace_id: workspaceId,
        user_id: user!.id,
        content,
        element_id: elementId ?? null,
      });
      if (error) throw error;
      await logWorkspaceActivity(workspaceId, user!.id, "menulis komentar");
    },
    onSuccess: invalidate,
  });

  const resolve = useMutation({
    mutationFn: async ({ id, is_resolved }: { id: string; is_resolved: boolean }) => {
      const { error } = await supabase
        .from("workspace_comments")
        .update({ is_resolved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, resolve, remove };
}

/* --------------------------------- messages -------------------------------- */

export function useWorkspaceMessages(workspaceId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`ws-messages-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "workspace_messages", filter: `workspace_id=eq.${workspaceId}` },
        () => qc.invalidateQueries({ queryKey: ["ws-messages", workspaceId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);

  return useQuery({
    queryKey: ["ws-messages", workspaceId],
    queryFn: async (): Promise<WorkspaceMessage[]> => {
      const { data, error } = await supabase
        .from("workspace_messages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (await withProfiles((data ?? []) as WorkspaceMessage[])) as WorkspaceMessage[];
    },
  });
}

export function useSendWorkspaceMessage(workspaceId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("workspace_messages")
        .insert({ workspace_id: workspaceId, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ws-messages", workspaceId] }),
  });
}

/* --------------------------------- members --------------------------------- */

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ["ws-members", workspaceId],
    refetchInterval: 20000,
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at");
      if (error) throw error;
      return (await withProfiles((data ?? []) as WorkspaceMember[])) as WorkspaceMember[];
    },
  });
}

/** Tandai kehadiran & catatan aktivitas anggota saat ini. */
export function useHeartbeat(workspaceId: string, note: string) {
  const { user } = useAuth();
  useEffect(() => {
    if (!workspaceId || !user) return;
    const ping = async () => {
      await supabase.from("workspace_members").upsert(
        {
          workspace_id: workspaceId,
          user_id: user.id,
          role: "member",
          activity_note: note,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,user_id" },
      );
    };
    void ping();
    const t = setInterval(ping, 60000);
    return () => clearInterval(t);
  }, [workspaceId, user, note]);
}

/* -------------------------------- activity --------------------------------- */

export function useWorkspaceActivity(workspaceId: string) {
  return useQuery({
    queryKey: ["ws-activity", workspaceId],
    refetchInterval: 30000,
    queryFn: async (): Promise<WorkspaceActivity[]> => {
      const { data, error } = await supabase
        .from("workspace_activity")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (await withProfiles((data ?? []) as WorkspaceActivity[])) as WorkspaceActivity[];
    },
  });
}
