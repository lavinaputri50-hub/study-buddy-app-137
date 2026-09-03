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

export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface SharedTask {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: Priority;
  assigned_to: string | null;
  is_done: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface StudyRoom {
  id: string;
  group_id: string;
  name: string;
  room_date: string;
  start_time: string;
  duration_minutes: number;
  target: string;
  target_description: string | null;
  is_completed: boolean;
  started_at: string | null;
  created_by: string;
  created_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  progress: number;
  joined_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface RoomComment {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  full_name?: string;
  avatar_url?: string | null;
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

/* --------------------------- shared task workspace -------------------------- */

export type TaskStatus = "not_started" | "in_progress" | "completed" | "overdue";

export interface SharedTaskMember {
  id: string;
  task_id: string;
  user_id: string;
  progress: number;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number;
  created_at: string;
  full_name?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  created_at: string;
  full_name?: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

/** Status efektif: overdue otomatis jika deadline lewat & belum selesai. */
export function effectiveStatus(
  status: string,
  deadline: string | null,
  progress: number,
): TaskStatus {
  if (status === "completed" || progress >= 100) return "completed";
  if (deadline && new Date(deadline).getTime() < Date.now()) return "overdue";
  if (progress > 0 || status === "in_progress") return "in_progress";
  return "not_started";
}

export function averageProgress(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function fileKind(name: string): string {
  const ext = name.split(".").pop()?.toUpperCase() ?? "FILE";
  return ext.length > 5 ? "FILE" : ext;
}

export function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
