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

  await sendSubscriptions(subs, payload);
}

export async function sendDailyDigest(userId, { urgent, later }) {
  if (!setup()) return;
  const subs = await prisma.subscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const line = (t) => `• ${t.title} (${formatDue(t.dueDate)})`;
  const body = [
    urgent.length > 0 ? `Entrega en ≤3 días (${urgent.length}):\n${urgent.slice(0, 4).map(line).join("\n")}` : "No hay tareas con entrega ≤3 días.",
    later.length > 0 ? `\nPróximas (${later.length}):\n${later.slice(0, 4).map(line).join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const payload = JSON.stringify({
    title: "Tus tareas de hoy",
    body,
    url: "/dashboard",
  });
  await sendSubscriptions(subs, payload);
}

function formatDue(dueDate) {
  const d = new Date(dueDate);
  const hours = (d.getTime() - Date.now()) / 36e5;
  if (hours < 24) return `${Math.max(1, Math.round(hours))}h`;
  return `${Math.round(hours / 24)}d`;
}

async function sendSubscriptions(subs, payload) {
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
