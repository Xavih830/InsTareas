import webpush from "web-push";
import { prisma } from "./db.js";

let configured = false;

function setup() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export async function notifyNewTasks(userId, tasks) {
  if (!setup() || tasks.length === 0) return;

  const subs = await prisma.subscription.findMany({ where: { userId } });
  const payload = JSON.stringify({
    title: `${tasks.length} nueva${tasks.length > 1 ? "s" : ""} tarea${tasks.length > 1 ? "s" : ""}`,
    body: tasks.slice(0, 2).map((t) => t.title).join(" · "),
    url: "/dashboard",
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch {
      if (sub.endpoint) {
        await prisma.subscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
      }
    }
  }
}
