import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskDTO } from "./types";

function dueLabel(dueDate: string) {
  const d = new Date(dueDate);
  if (isPast(d)) {
    return {
      text: `Venció ${formatDistanceToNowStrict(d, { locale: es })}`,
      past: true,
    };
  }
  const hours = (d.getTime() - Date.now()) / 36e5;
  if (hours < 24) {
    return { text: `Hoy · ${format(d, "HH:mm")}`, past: false };
  }
  const days = Math.ceil(hours / 24);
  return { text: `En ${days} ${days === 1 ? "día" : "días"} · ${format(d, "d MMM, HH:mm", { locale: es })}`, past: false };
}

export function TaskCard({
  task,
  onOpen,
  onToggle,
}: {
  task: TaskDTO;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const due = dueLabel(task.dueDate);
  const completed = task.status === "COMPLETADA";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-colors hover:border-border",
        completed && "opacity-60"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="mt-0.5 h-6 w-6 shrink-0 rounded-full"
        aria-label={completed ? "Marcar pendiente" : "Completar"}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-[15px] font-medium leading-snug", completed && "line-through")}>
            {task.title}
          </p>
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {task.importance === "ALTA" ? "Alta" : task.importance === "MEDIA" ? "Media" : "Baja"}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">{task.course}</p>
        <p
          className={cn(
            "mt-2 flex items-center gap-1.5 text-xs",
            due.past ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          <Clock className="h-3 w-3" />
          {due.text}
        </p>
      </div>
    </div>
  );
}
