export type Importance = "BAJA" | "MEDIA" | "ALTA";
export type TaskStatus = "PENDIENTE" | "EN_PROGRESO" | "COMPLETADA";

export const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  BAJA: 0.5,
  MEDIA: 1,
  ALTA: 1.5,
};

export const URGENCY_WINDOW_DAYS = 14;

export function daysUntil(dueDate: Date, now: Date = new Date()): number {
  return (dueDate.getTime() - now.getTime()) / 86_400_000;
}

export function urgencyScore(daysLeft: number): number {
  return Math.max(0, Math.min(1, 1 - daysLeft / URGENCY_WINDOW_DAYS));
}

export function priorityScore(
  dueDate: Date,
  importance: Importance = "MEDIA",
  status: TaskStatus = "PENDIENTE",
  now: Date = new Date()
): number {
  if (status === "COMPLETADA") return 0;
  const urgency = urgencyScore(daysUntil(dueDate, now));
  return Math.round(urgency * IMPORTANCE_WEIGHT[importance] * 1000) / 1000;
}

export function inferImportance(title: string): Importance {
  const t = title.toLowerCase();
  if (
    /examen|evaluacion|evaluación|proyecto final|parcial|final|defensa|sustentación|sustentacion/i.test(
      t
    )
  ) {
    return "ALTA";
  }
  if (/foro|tarea corta|handout|lectura|quiz corto|participación|participacion/i.test(t)) {
    return "BAJA";
  }
  return "MEDIA";
}

export function sortByPriority<T extends { priorityScore: number; status: TaskStatus }>(
  tasks: T[]
): T[] {
  return [...tasks].sort((a, b) => {
    if (a.status === "COMPLETADA" && b.status !== "COMPLETADA") return 1;
    if (b.status === "COMPLETADA" && a.status !== "COMPLETADA") return -1;
    return b.priorityScore - a.priorityScore;
  });
}
