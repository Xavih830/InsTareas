import { prisma } from "./db.js";
import { decryptSecret } from "./crypto.js";
import { notifyNewTasks, sendDailyDigest } from "./push.js";
import {
  CanvasAuthError,
  getCourses,
  getFutureAssignments,
  getUpcomingEvents,
  mergeEvents,
  priorityScore,
  toTask,
} from "./scraper/canvas.js";
import { icsToTask, parseCalendarFeed } from "./scraper/ics.js";

const MAX_FAILED_ATTEMPTS = 3;
const DIGEST_HOUR = 7; // hora local ESPOL (UTC-5) de envío del recordatorio diario

function localDateKey(now) {
  return new Date(now.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

async function maybeSendDailyDigest(user, now = Date.now()) {
  const local = new Date(now - 5 * 3600 * 1000);
  if (local.getUTCHours() !== DIGEST_HOUR) return;
  if (user.lastDigestAt && localDateKey(user.lastDigestAt) === localDateKey(now)) return;

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, status: { not: "COMPLETADA" } },
  });
  if (tasks.length === 0) return;

  const toSend = {
    urgent: tasks.filter((t) => t.dueDate.getTime() - now <= 3 * 86400e3),
    later: tasks.filter((t) => t.dueDate.getTime() - now > 3 * 86400e3),
  };
  if (toSend.urgent.length === 0 && toSend.later.length === 0) return;

  await sendDailyDigest(user.id, toSend);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastDigestAt: new Date() },
  });
  console.log(`Digest diario enviado a ${user.email} (${toSend.urgent.length} urgentes, ${toSend.later.length} próximas)`);
}

async function persistTasks(user, tasks) {
  const newTasks = [];
  for (const t of tasks) {
    const existing = await prisma.task.findUnique({
      where: { userId_externalId: { userId: user.id, externalId: t.externalId } },
    });
    if (!existing) newTasks.push(t);
    await prisma.task.upsert({
      where: { userId_externalId: { userId: user.id, externalId: t.externalId } },
      update: {
        title: t.title,
        course: t.course,
        dueDate: t.dueDate,
        description: t.description,
        sourceUrl: t.sourceUrl,
        importance: t.importance,
        priorityScore: t.priorityScore,
      },
      create: {
        userId: user.id,
        externalId: t.externalId,
        title: t.title,
        course: t.course,
        dueDate: t.dueDate,
        description: t.description,
        sourceUrl: t.sourceUrl,
        importance: t.importance,
        priorityScore: t.priorityScore,
      },
    });
  }

  // Quita automáticamente las tareas que ya vencieron: al sincronizar, todo lo
  // con dueDate en el pasado desaparece de la BD (y del dashboard/calendario).
  const expired = await prisma.task.deleteMany({
    where: { userId: user.id, dueDate: { lt: new Date() } },
  });

  await notifyNewTasks(user.id, newTasks);

  return { found: tasks.length, removed: expired.count };
}

async function syncUserViaToken(user) {
  const token = decryptSecret(user.espolToken);
  if (!token) {
    throw new Error("El usuario no tiene token de Canvas configurado");
  }

  const events = await getUpcomingEvents(token);
  const courses = await getCourses(token);
  const futureAssignments = await getFutureAssignments(token, courses);

  if (courses.size > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { courseNames: Object.fromEntries(courses) },
    });
  }

  const tasks = mergeEvents(events, futureAssignments)
    .map((e) => toTask(e, courses))
    .filter(Boolean)
    .map((t) => ({
      ...t,
      priorityScore: priorityScore(t.dueDate, t.importance, "PENDIENTE"),
    }));

  return { tasks, source: "api" };
}

async function syncUserViaFeed(user) {
  if (!user.calendarFeedUrl) {
    throw new Error("El usuario no tiene feed de calendario configurado");
  }
  const feedUrl = decryptSecret(user.calendarFeedUrl);
  const res = await fetch(feedUrl);
  if (!res.ok) {
    throw new Error(`Feed de calendario ${res.status}`);
  }
  const feed = parseCalendarFeed(await res.text());
  const courses = new Map();
  if (user.courseNames) {
    for (const [id, name] of Object.entries(user.courseNames)) courses.set(id, name);
  }
  const now = Date.now();
  const tasks = feed
    .map((e) => icsToTask(e, courses))
    .filter(Boolean)
    .filter((t) => t.dueDate.getTime() >= now)
    .map((t) => ({
      ...t,
      priorityScore: priorityScore(t.dueDate, t.importance, "PENDIENTE"),
    }));

  return { tasks, source: "ics" };
}

async function syncUser(user) {
  if (user.espolToken) {
    try {
      return await syncUserViaToken(user);
    } catch (err) {
      if (err instanceof CanvasAuthError && user.calendarFeedUrl) {
        console.log(`  fallback a feed ICS para ${user.email}`);
        return await syncUserViaFeed(user);
      }
      throw err;
    }
  }
  return syncUserViaFeed(user);
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ requiresReauth: false }, { calendarFeedUrl: { not: null } }],
    },
  });

  if (users.length === 0) {
    const totalUsers = await prisma.user.count();
    await prisma.$disconnect();
    if (totalUsers > 0) {
      console.error("Todos los usuarios requieren reautenticación; nada que sincronizar");
      process.exit(1);
    }
    console.log("Sin usuarios registrados; nada que sincronizar");
    return;
  }

  let anyFailed = false;
  for (const user of users) {
    let attempts = 0;
    try {
      const sync = await syncUser(user);
      const persisted = await persistTasks(user, sync.tasks);
      await prisma.syncLog.create({
        data: { userId: user.id, success: true, tasksFound: sync.tasks.length },
      });
      if (user.requiresReauth) {
        await prisma.user.update({
          where: { id: user.id },
          data: { requiresReauth: false },
        });
      }
      console.log(`OK ${user.email} (${sync.source}): ${sync.tasks.length} tareas, ${persisted.removed} vencidas eliminadas`);
      await maybeSendDailyDigest(user);
    } catch (err) {
      attempts++;
      const isAuth = err instanceof CanvasAuthError;
      console.error(`FAIL ${user.email}: ${err.message}`);
      await prisma.syncLog.create({
        data: {
          userId: user.id,
          success: false,
          tasksFound: 0,
          error: err.message,
        },
      });
      if (isAuth || attempts >= MAX_FAILED_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: { requiresReauth: true },
        });
        console.error(`Marcado para reautenticación: ${user.email}`);
      }
      anyFailed = true;
    }
  }

  await prisma.$disconnect();
  if (anyFailed) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
