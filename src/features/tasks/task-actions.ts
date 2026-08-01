"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { priorityScore } from "@/lib/priority";
import { requireUser } from "@/server/actions/auth";

export async function setTaskImportance(taskId: string, importance: "BAJA" | "MEDIA" | "ALTA") {
  const session = await requireUser();
  const task = await db.task.findFirst({ where: { id: taskId, userId: session.userId } });
  if (!task) return { error: "Tarea no encontrada" };

  await db.task.update({
    where: { id: taskId },
    data: { importance, priorityScore: priorityScore(task.dueDate, importance, task.status) },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setTaskStatus(taskId: string, status: "PENDIENTE" | "EN_PROGRESO" | "COMPLETADA") {
  const session = await requireUser();
  const task = await db.task.findFirst({ where: { id: taskId, userId: session.userId } });
  if (!task) return { error: "Tarea no encontrada" };

  const score = status === "COMPLETADA" ? 0 : priorityScore(task.dueDate, task.importance, status);
  await db.task.update({ where: { id: taskId }, data: { status, priorityScore: score } });
  revalidatePath("/dashboard");
  return { ok: true };
}
