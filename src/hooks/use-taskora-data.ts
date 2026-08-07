import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Profile, Schedule, Task } from "@/lib/taskora";

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, language, theme")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

export interface TaskInput {
  title: string;
  description: string | null;
  deadline: string | null;
  priority: Task["priority"];
}

export function useTaskMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const create = useMutation({
    mutationFn: async (input: TaskInput) => {
      const { error } = await supabase.from("tasks").insert({ ...input, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export function useSchedules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["schedules", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Schedule[]> => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as Schedule[];
    },
  });
}

export interface ScheduleInput {
  day_of_week: number;
  subject: string;
  start_time: string;
  end_time: string;
}

export function useScheduleMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["schedules"] });

  const create = useMutation({
    mutationFn: async (input: ScheduleInput) => {
      const { error } = await supabase.from("schedules").insert({ ...input, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: ScheduleInput & { id: string }) => {
      const { error } = await supabase.from("schedules").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
