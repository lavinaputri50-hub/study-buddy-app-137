import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type {
  GroupMember,
  GroupMessage,
  RoomComment,
  RoomMember,
  SharedTask,
  StudyGroup,
  StudyRoom,
} from "@/lib/taskora";

/* ---------------------------------- groups --------------------------------- */

export function useMyGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["groups", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<(StudyGroup & { member_count: number; role: string })[]> => {
      const { data: memberships, error } = await supabase
        .from("study_group_members")
        .select("group_id, role")
        .eq("user_id", user!.id);
      if (error) throw error;
      const ids = (memberships ?? []).map((m) => m.group_id);
      if (ids.length === 0) return [];

      const [{ data: groups, error: gErr }, { data: allMembers, error: mErr }] = await Promise.all([
        supabase.from("study_groups").select("*").in("id", ids),
        supabase.from("study_group_members").select("group_id").in("group_id", ids),
      ]);
      if (gErr) throw gErr;
      if (mErr) throw mErr;

      return (groups ?? []).map((g) => ({
        ...(g as StudyGroup),
        member_count: (allMembers ?? []).filter((m) => m.group_id === g.id).length,
        role: memberships!.find((m) => m.group_id === g.id)?.role ?? "member",
      }));
    },
  });
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: async (): Promise<StudyGroup | null> => {
      const { data, error } = await supabase
        .from("study_groups")
        .select("*")
        .eq("id", groupId)
        .maybeSingle();
      if (error) throw error;
      return data as StudyGroup | null;
    },
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async (): Promise<GroupMember[]> => {
      const { data, error } = await supabase
        .from("study_group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("joined_at");
      if (error) throw error;
      const rows = (data ?? []) as GroupMember[];
      const ids = rows.map((r) => r.user_id);
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
    },
  });
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function useGroupMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["groups"] });
    qc.invalidateQueries({ queryKey: ["group-members"] });
  };

  const create = useMutation({
    mutationFn: async (input: { name: string; description: string | null }) => {
      const code = randomCode();
      const { data, error } = await supabase
        .from("study_groups")
        .insert({ ...input, code, created_by: user!.id })
        .select("id, code")
        .single();
      if (error) throw error;
      const { error: mErr } = await supabase
        .from("study_group_members")
        .insert({ group_id: data.id, user_id: user!.id, role: "admin" });
      if (mErr) throw mErr;
      return data;
    },
    onSuccess: invalidate,
  });

  const join = useMutation({
    mutationFn: async (code: string) => {
      const { data: group, error } = await supabase
        .from("study_groups")
        .select("id, name")
        .eq("code", code.trim().toUpperCase())
        .maybeSingle();
      if (error) throw error;
      if (!group) throw new Error("Kode grup tidak ditemukan");
      const { error: mErr } = await supabase
        .from("study_group_members")
        .insert({ group_id: group.id, user_id: user!.id, role: "member" });
      if (mErr && !mErr.message.includes("duplicate")) throw mErr;
      return group;
    },
    onSuccess: invalidate,
  });

  const leave = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("study_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, join, leave };
}

/* ------------------------------- shared tasks ------------------------------ */

export function useSharedTasks(groupId: string) {
  return useQuery({
    queryKey: ["shared-tasks", groupId],
    queryFn: async (): Promise<SharedTask[]> => {
      const { data, error } = await supabase
        .from("shared_tasks")
        .select("*")
        .eq("group_id", groupId)
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as SharedTask[];
    },
  });
}

export function useSharedTaskMutations(groupId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["shared-tasks", groupId] });

  const create = useMutation({
    mutationFn: async (input: Partial<SharedTask>) => {
      const { error } = await supabase
        .from("shared_tasks")
        .insert({
          group_id: groupId,
          created_by: user!.id,
          title: input.title!,
          description: input.description ?? null,
          deadline: input.deadline ?? null,
          priority: input.priority ?? "medium",
          assigned_to: input.assigned_to ?? null,
        });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SharedTask> & { id: string }) => {
      const { error } = await supabase.from("shared_tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shared_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

/* ----------------------------------- chat ---------------------------------- */

export function useGroupMessages(groupId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["group-messages", groupId],
    refetchInterval: 4000,
    queryFn: async (): Promise<GroupMessage[]> => {
      const { data, error } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at");
      if (error) throw error;
      const rows = (data ?? []) as GroupMessage[];
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
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["group-messages", groupId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, qc]);

  return query;
}

export function useSendMessage(groupId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("group_messages")
        .insert({ group_id: groupId, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-messages", groupId] }),
  });
}

/* -------------------------------- study rooms ------------------------------ */

export function useGroupRooms(groupId: string) {
  return useQuery({
    queryKey: ["study-rooms", groupId],
    queryFn: async (): Promise<StudyRoom[]> => {
      const { data, error } = await supabase
        .from("study_rooms")
        .select("*")
        .eq("group_id", groupId)
        .order("room_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudyRoom[];
    },
  });
}

export function useAllRooms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-rooms", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<StudyRoom[]> => {
      const { data, error } = await supabase
        .from("study_rooms")
        .select("*")
        .order("room_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudyRoom[];
    },
  });
}

export function useMyRoomHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["room-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: mine, error } = await supabase
        .from("study_room_members")
        .select("room_id, progress")
        .eq("user_id", user!.id);
      if (error) throw error;
      const ids = (mine ?? []).map((m) => m.room_id);
      if (ids.length === 0) return [] as (StudyRoom & { progress: number })[];
      const { data: rooms, error: rErr } = await supabase
        .from("study_rooms")
        .select("*")
        .in("id", ids);
      if (rErr) throw rErr;
      return (rooms ?? [])
        .map((r) => ({
          ...(r as StudyRoom),
          progress: mine!.find((m) => m.room_id === r.id)?.progress ?? 0,
        }))
        .sort((a, b) => (a.room_date < b.room_date ? 1 : -1));
    },
  });
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: ["study-room", roomId],
    refetchInterval: 10000,
    queryFn: async (): Promise<StudyRoom | null> => {
      const { data, error } = await supabase
        .from("study_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();
      if (error) throw error;
      return data as StudyRoom | null;
    },
  });
}

export function useRoomMembers(roomId: string) {
  return useQuery({
    queryKey: ["room-members", roomId],
    refetchInterval: 5000,
    queryFn: async (): Promise<RoomMember[]> => {
      const { data, error } = await supabase
        .from("study_room_members")
        .select("*")
        .eq("room_id", roomId)
        .order("joined_at");
      if (error) throw error;
      const rows = (data ?? []) as RoomMember[];
      const ids = rows.map((r) => r.user_id);
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
    },
  });
}

export function useRoomComments(roomId: string) {
  return useQuery({
    queryKey: ["room-comments", roomId],
    refetchInterval: 5000,
    queryFn: async (): Promise<RoomComment[]> => {
      const { data, error } = await supabase
        .from("study_room_comments")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at");
      if (error) throw error;
      const rows = (data ?? []) as RoomComment[];
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
    },
  });
}

export function useRoomMutations(roomId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("study_room_members")
        .upsert({ room_id: roomId, user_id: user!.id }, { onConflict: "room_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room-members", roomId] }),
  });

  const setProgress = useMutation({
    mutationFn: async (progress: number) => {
      const { error } = await supabase
        .from("study_room_members")
        .update({ progress })
        .eq("room_id", roomId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room-members", roomId] }),
  });

  const comment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("study_room_comments")
        .insert({ room_id: roomId, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room-comments", roomId] }),
  });

  const complete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("study_rooms")
        .update({ is_completed: true })
        .eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-room", roomId] });
      qc.invalidateQueries({ queryKey: ["room-history"] });
    },
  });

  return { join, setProgress, comment, complete };
}

export function useCreateRoom(groupId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      room_date: string;
      start_time: string;
      duration_minutes: number;
      target: string;
      target_description: string | null;
    }) => {
      const { data, error } = await supabase
        .from("study_rooms")
        .insert({ ...input, group_id: groupId, created_by: user!.id })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-rooms", groupId] });
      qc.invalidateQueries({ queryKey: ["all-rooms"] });
    },
  });
}
