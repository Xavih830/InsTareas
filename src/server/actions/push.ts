"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/server/actions/auth";

export async function subscribeUser(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await requireUser();
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return { error: "Suscripción inválida" };
  }
  await db.subscription.upsert({
    where: { endpoint },
    update: { userId: session.userId, p256dh: keys.p256dh, auth: keys.auth },
    create: {
      endpoint,
      userId: session.userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });
  return { ok: true };
}

export async function unsubscribeUser(endpoint: string) {
  await requireUser();
  await db.subscription.deleteMany({ where: { endpoint } });
  return { ok: true };
}
