import { prisma } from "./db.js";
import { decryptSecret } from "./crypto.js";
import { notifyNewTasks } from "./push.js";
import {
  CanvasAuthError,
  getCourses,
  getFutureAssignments,
  getUpcomingEvents,
  mergeEvents,
  priorityScore,
  toTask,
} from "./scraper/canvas.js";

const MAX_FAILED_ATTEMPTS = 3;

async function syncUser(user) {
  const token = decryptSecret(user.espolToken);
  if (!token) {
    throw new Error("El usuario no tiene token de Canvas configurado");
  }

  const events = await getUpcomingEvents(token);
  const courses = await getCourses(token);
  const futureAssignments = await getFutureAssignments(token, courses);

  const tasks = mergeEvents(events, futureAssignments)
    .map((e) => toTask(e, courses))
    .filter(Boolean)
    .map((t) => ({
      ...t,
      priorityScore: priorityScore(t.dueDate, t.importance, "PENDIENTE"),
    }));

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

  const pendingIds = tasks.map((t) => t.externalId);
  const completed = await prisma.task.updateMany({
    where: {
      userId: user.id,
      status: { not: "COMPLETADA" },
      externalId: { notIn: pendingIds },
      dueDate: { lt: new Date() },
    },
    data: { status: "COMPLETADA" },
  });

  await notifyNewTasks(user.id, newTasks);

  return { found: tasks.length, completed: completed.count };
}

async function main() {
  const users = await prisma.user.findMany({
    where: { requiresReauth: false },
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
      const result = await syncUser(user);
      await prisma.syncLog.create({
        data: { userId: user.id, success: true, tasksFound: result.found },
      });
      console.log(`OK ${user.email}: ${result.found} tareas`);
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
