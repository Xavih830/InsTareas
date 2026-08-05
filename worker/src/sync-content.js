import { prisma } from "./db.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { syncCourseContent } from "./jobs/content-sync.js";
import { CanvasAuthError } from "./scraper/canvas.js";
import { closeBrowser, isValidSession, loginWithCredentials } from "./session.js";

// Sync de contenido (módulos/ítems por curso). Corre desde GitHub Actions
// (diario o bajo demanda). Reutiliza la credencial de Canvas: sesión headless
// guardada (si sigue válida) > PAT > login OIDC con las credenciales cifradas.
async function resolveCanvasCred(user) {
  const sessionCookie = decryptSecret(user.espolSession);
  if (sessionCookie && (await isValidSession(sessionCookie))) {
    return { cookie: sessionCookie };
  }
  const token = decryptSecret(user.espolToken);
  if (token) return token;
  const password = decryptSecret(user.espolPassword);
  if (user.espolUsername && password) {
    const cookie = await loginWithCredentials(user.espolUsername, password);
    await prisma.user.update({
      where: { id: user.id },
      data: { espolSession: encryptSecret(cookie) },
    });
    return { cookie };
  }
  return null;
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ requiresReauth: false }, { calendarFeedUrl: { not: null } }],
    },
  });

  if (users.length === 0) {
    console.log("Sin usuarios para sincronizar contenido");
    return;
  }

  let anyFailed = false;
  for (const user of users) {
    try {
      const cred = await resolveCanvasCred(user);
      if (!cred) {
        console.error(`SKIP ${user.email}: sin credenciales de Canvas`);
        continue;
      }
      const stats = await syncCourseContent(user.id, cred);
      await prisma.syncLog.create({
        data: {
          userId: user.id,
          success: true,
          tasksFound: stats.items,
          scope: "content",
        },
      });
      console.log(
        `OK ${user.email}: ${stats.courses} cursos, ${stats.modules} módulos, ${stats.items} ítems`
      );
    } catch (err) {
      const isAuth = err instanceof CanvasAuthError;
      console.error(`FAIL ${user.email}: ${err.message}`);
      await prisma.syncLog.create({
        data: {
          userId: user.id,
          success: false,
          tasksFound: 0,
          scope: "content",
          error: err.message,
        },
      });
      if (isAuth && user.espolSession && !user.espolToken) {
        await prisma.user.update({
          where: { id: user.id },
          data: { espolSession: null },
        }).catch(() => {});
      }
      anyFailed = true;
    }
  }

  await closeBrowser();
  await prisma.$disconnect();
  if (anyFailed) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  await closeBrowser();
  await prisma.$disconnect();
  process.exit(1);
});
