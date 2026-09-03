import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type {
  AppNotification,
  SharedTask,
  SharedTaskMember,
  TaskActivity,
  TaskAttachment,
  TaskComment,
} from "@/lib/taskora";

const BUCKET = "task-files";

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

/** Kirim notifikasi ke semua anggota grup (kecuali pengirim). */
export async function notifyGroup(groupId: string, message: string, exceptUserId?: string) {
  const { data: members } = await supabase
    .from("study_group_members")
    .select("user_id")
    .eq("group_id", groupId);
  const rows = (members ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== exceptUserId)
    .map((user_id) => ({ user_id, message }));
  if (rows.length === 0) return;
  await supabase.from("notifications").insert(rows);
}

/* ------------------------------- notifications ----------------------------- */

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useMarkNotificationsRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/* --------------------------------- the task -------------------------------- */

export function useSharedTask(taskId: string) {
  return useQuery({
    queryKey: ["shared-task", taskId],
    refetchInterval: 8000,
    queryFn: async (): Promise<SharedTask | null> => {
      const { data, error } = await supabase
        .from("shared_tasks")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();
      if (error) throw error;
      return data as SharedTask | null;
    },
  });
}

export function useTaskMembers(taskId: string) {
  return useQuery({
    queryKey: ["task-members", taskId],
    refetchInterval: 6000,
    queryFn: async (): Promise<SharedTaskMember[]> => {
      const { data, error } = await supabase
        .from("shared_task_members")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at");
      if (error) throw error;
      return (await withProfiles((data ?? []) as SharedTaskMember[])) as SharedTaskMember[];
    },
  });
}

/** Progress semua shared task dalam satu grup, dipakai untuk kartu daftar. */
export function useGroupTaskProgress(groupId: string) {
  return useQuery({
    queryKey: ["group-task-progress", groupId],
    refetchInterval: 10000,
    queryFn: async (): Promise<Record<string, { progress: number; members: number }>> => {
      const { data: tasks } = await supabase
        .from("shared_tasks")
        .select("id")
        .eq("group_id", groupId);
      const ids = (tasks ?? []).map((t) => t.id);
      if (ids.length === 0) return {};
      const { data: rows, error } = await supabase
        .from("shared_task_members")
        .select("task_id, progress")
        .in("task_id", ids);
      if (error) throw error;
      const map: Record<string, { progress: number; members: number }> = {};
      for (const id of ids) {
        const mine = (rows ?? []).filter((r) => r.task_id === id);
        map[id] = {
          members: mine.length,
          progress:
            mine.length === 0
              ? 0
              : Math.round(mine.reduce((a, b) => a + (b.progress ?? 0), 0) / mine.length),
        };
      }
      return map;
    },
  });
}

export function useTaskAttachments(taskId: string) {
  return useQuery({
    queryKey: ["task-attachments", taskId],
    refetchInterval: 15000,
    queryFn: async (): Promise<TaskAttachment[]> => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as TaskAttachment[];
      const ids = [...new Set(rows.map((r) => r.uploaded_by))];
      if (ids.length === 0) return rows;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      return rows.map((r) => ({
        ...r,
        full_name: profiles?.find((p) => p.id === r.uploaded_by)?.full_name ?? "Anggota",
      }));
    },
  });
}

export function useTaskComments(taskId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["task-comments", taskId],
    refetchInterval: 5000,
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at");
      if (error) throw error;
      return (await withProfiles((data ?? []) as TaskComment[])) as TaskComment[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` },
        () => qc.invalidateQueries({ queryKey: ["task-comments", taskId] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shared_task_members",
          filter: `task_id=eq.${taskId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["task-members", taskId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [taskId, qc]);

  return query;
}

export function useTaskActivity(taskId: string) {
  return useQuery({
    queryKey: ["task-activity", taskId],
    refetchInterval: 10000,
    queryFn: async (): Promise<TaskActivity[]> => {
      const { data, error } = await supabase
        .from("task_activity")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (await withProfiles((data ?? []) as TaskActivity[])) as TaskActivity[];
    },
  });
}

export async function getFileUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadTaskFile(groupId: string, taskId: string, file: File) {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${groupId}/${taskId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, name: file.name, type: file.type || null, size: file.size };
}

/* -------------------------------- mutations -------------------------------- */

export function useWorkspaceMutations(taskId: string, groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["shared-task", taskId] });
    qc.invalidateQueries({ queryKey: ["task-members", taskId] });
    qc.invalidateQueries({ queryKey: ["task-activity", taskId] });
    qc.invalidateQueries({ queryKey: ["task-attachments", taskId] });
    qc.invalidateQueries({ queryKey: ["shared-tasks"] });
    qc.invalidateQueries({ queryKey: ["group-task-progress"] });
  };

  const log = async (action: string) => {
    await supabase.from("task_activity").insert({ task_id: taskId, user_id: user!.id, action });
  };

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("shared_task_members")
        .upsert({ task_id: taskId, user_id: user!.id }, { onConflict: "task_id,user_id" });
      if (error) throw error;
      await log("bergabung mengerjakan task");
    },
    onSuccess: invalidateAll,
  });

  const setProgress = useMutation({
    mutationFn: async ({ progress, note }: { progress: number; note?: string | null }) => {
      const { error } = await supabase
        .from("shared_task_members")
        .upsert(
          {
            task_id: taskId,
            user_id: user!.id,
            progress,
            note: note ?? null,
            status: progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started",
          },
          { onConflict: "task_id,user_id" },
        );
      if (error) throw error;
      await log(
        progress >= 100 ? "menyelesaikan targetnya 🎉" : `mengubah progress menjadi ${progress}%`,
      );

      // hitung ulang progress keseluruhan
      const { data: rows } = await supabase
        .from("shared_task_members")
        .select("progress")
        .eq("task_id", taskId);
      const list = (rows ?? []).map((r) => r.progress ?? 0);
      const overall =
        list.length === 0 ? 0 : Math.round(list.reduce((a, b) => a + b, 0) / list.length);
      const done = list.length > 0 && list.every((p) => p >= 100);
      await supabase
        .from("shared_tasks")
        .update({
          status: done ? "completed" : overall > 0 ? "in_progress" : "not_started",
          is_done: done,
        })
        .eq("id", taskId);

      if (done && groupId) await notifyGroup(groupId, "Shared task selesai 🎉", undefined);
      else if (progress >= 100 && groupId)
        await notifyGroup(groupId, "Seorang anggota menyelesaikan targetnya", user!.id);
      return { done, overall };
    },
    onSuccess: invalidateAll,
  });

  const comment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("task_comments")
        .insert({ task_id: taskId, user_id: user!.id, content });
      if (error) throw error;
      await log("menambahkan komentar");
      if (groupId) await notifyGroup(groupId, "Komentar baru pada shared task", user!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
      qc.invalidateQueries({ queryKey: ["task-activity", taskId] });
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!groupId) throw new Error("Grup tidak ditemukan");
      const meta = await uploadTaskFile(groupId, taskId, file);
      const { error } = await supabase.from("task_attachments").insert({
        task_id: taskId,
        uploaded_by: user!.id,
        file_name: meta.name,
        file_path: meta.path,
        file_type: meta.type,
        file_size: meta.size,
      });
      if (error) throw error;
      await log(`mengunggah ${meta.name}`);
      await notifyGroup(groupId, `File baru: ${meta.name}`, user!.id);
    },
    onSuccess: invalidateAll,
  });

  const removeAttachment = useMutation({
    mutationFn: async (att: TaskAttachment) => {
      const { error } = await supabase.from("task_attachments").delete().eq("id", att.id);
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([att.file_path]);
    },
    onSuccess: invalidateAll,
  });

  const updateTask = useMutation({
    mutationFn: async (patch: Partial<SharedTask>) => {
      const { error } = await supabase.from("shared_tasks").update(patch).eq("id", taskId);
      if (error) throw error;
      await log("memperbarui detail task");
    },
    onSuccess: invalidateAll,
  });

  const addMembers = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (userIds.length === 0) return;
      const { error } = await supabase
        .from("shared_task_members")
        .upsert(
          userIds.map((user_id) => ({ task_id: taskId, user_id })),
          { onConflict: "task_id,user_id" },
        );
      if (error) throw error;
      await log("menambahkan anggota ke task");
    },
    onSuccess: invalidateAll,
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("shared_task_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  return { join, setProgress, comment, upload, removeAttachment, updateTask, addMembers, removeMember };
}
