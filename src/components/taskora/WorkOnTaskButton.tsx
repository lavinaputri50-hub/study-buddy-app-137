import { useNavigate } from "@tanstack/react-router";
import { PenLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOpenStudio } from "@/hooks/use-studio";

interface Props {
  taskId: string;
  title: string;
  taskKind: "personal" | "shared";
  groupId?: string | null;
  assignmentType?: string;
  className?: string;
  variant?: "default" | "outline";
}

/** Membuka (atau membuat) Taskora Studio untuk sebuah tugas. */
export function WorkOnTaskButton({
  taskId,
  title,
  taskKind,
  groupId,
  assignmentType,
  className,
  variant = "default",
}: Props) {
  const navigate = useNavigate();
  const open = useOpenStudio();

  return (
    <Button
      variant={variant}
      className={`rounded-xl ${className ?? ""}`}
      disabled={open.isPending || !taskId}
      onClick={() =>
        open.mutate(
          { taskId, title, taskKind, groupId: groupId ?? null, assignmentType: assignmentType ?? "note" },
          {
            onSuccess: (workspaceId) =>
              navigate({ to: "/studio/$workspaceId", params: { workspaceId } }),
            onError: () => toast.error("Gagal membuka Taskora Studio"),
          },
        )
      }
    >
      {open.isPending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <PenLine className="mr-1.5 h-4 w-4" />
      )}
      Work on Task
    </Button>
  );
}
