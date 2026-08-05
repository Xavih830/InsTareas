import { prisma } from "../db.js";
import {
  deleteGoogleEvent,
  insertGoogleEvent,
  listGoogleEvents,
  taskToGoogleEvent,
  updateGoogleEvent,
} from "../calendar/google.js";

// Mantiene el calendario externo del usuario sincronizado con las tareas
// PENDIENTES/EN_PROGRESO no vencidas: inserta las nuevas, actualiza las
// modificadas y borra las que ya no deben existir (vencidas/completadas).
// `expiredEventIds`: ids de eventos en Google de tareas que el worker ya borró
// de la BD (vencidas); se eliminan del calendario externo.
export async function syncGoogleCalendar(userId, expiredEventIds = []) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!connection) return null;

  const calendarId = connection.calendarId ?? "primary";

  const tasks = await prisma.task.findMany({
    where: { userId, status: { not: "COMPLETADA" }, dueDate: { gte: new Date() } },
  });

  const existing = await listGoogleEvents(connection, calendarId);
  const existingById = new Map();
  for (const ev of existing) {
    if (ev.id) existingById.set(ev.id, ev);
  }

  const syncedIds = new Set();
  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  for (const task of tasks) {
    const event = taskToGoogleEvent(task);
    if (task.calendarEventId && existingById.has(task.calendarEventId)) {
      const ev = existingById.get(task.calendarEventId);
      if (ev.summary !== event.summary || ev.start?.dateTime !== event.start.dateTime) {
        await updateGoogleEvent(connection, calendarId, task.calendarEventId, event);
        updated++;
      }
      syncedIds.add(task.calendarEventId);
    } else {
      const created = await insertGoogleEvent(connection, calendarId, event);
      await prisma.task.update({
        where: { id: task.id },
        data: { calendarEventId: created.id },
      });
      syncedIds.add(created.id);
      inserted++;
    }
  }

  for (const [eventId] of existingById) {
    if (syncedIds.has(eventId)) continue;
    const belongsToApp = expiredEventIds.includes(eventId) ||
      (await prisma.task.count({ where: { userId, calendarEventId: eventId } })) > 0;
    if (belongsToApp) {
      await deleteGoogleEvent(connection, calendarId, eventId);
      deleted++;
    }
    // Los eventos del calendario del usuario que no son nuestros se respetan.
  }

  return { inserted, updated, deleted };
}
