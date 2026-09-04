import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/taskora";

const STYLES: Record<TaskStatus, string> = {
  not_started: "border-border bg-muted text-muted-foreground",
  in_progress: "border-primary/25 bg-primary/10 text-primary",
  completed: "border-success/20 bg-success/10 text-success",
  overdue: "border-destructive/20 bg-destructive/10 text-destructive",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium", STYLES[status])}>
      {TASK_STATUS_LABEL[status]}
    </Badge>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="gradient-brand h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
