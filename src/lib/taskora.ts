export type Priority = "high" | "medium" | "low";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: Priority;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  day_of_week: number;
  subject: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  language: string;
  theme: string;
}

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const MOTIVATIONS = [
  "Small progress is still progress.",
  "Discipline beats motivation.",
  "Keep learning, your future self will thank you.",
  "One task at a time. You're closer than you think.",
  "Consistency turns effort into results.",
];

export function formatDeadline(value: string | null): string {
  if (!value) return "Tanpa deadline";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value: string): string {
  return value.slice(0, 5);
}

/** Selisih hari menuju deadline (bisa negatif jika lewat). */
export function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Tugas dianggap mendesak jika belum selesai dan deadline <= 2 hari lagi. */
export function isUrgent(task: Task): boolean {
  if (task.is_done) return false;
  const d = daysUntil(task.deadline);
  return d !== null && d <= 2;
}

export function computeStats(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.is_done).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, pending, progress };
}
