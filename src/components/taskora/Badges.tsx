import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, type Priority } from "@/lib/taskora";

const STYLES: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/15 text-warning-foreground border-warning/30",
  low: "bg-success/10 text-success border-success/20",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium", STYLES[priority])}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

export function StatusBadge({ done }: { done: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full font-medium",
        done
          ? "border-success/20 bg-success/10 text-success"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {done ? "Selesai" : "Belum Selesai"}
    </Badge>
  );
}
