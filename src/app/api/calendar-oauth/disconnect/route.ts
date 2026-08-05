import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  await db.calendarConnection.delete({
    where: { userId_provider: { userId: session.userId, provider: "google" } },
  });

  await db.task.updateMany({
    where: { userId: session.userId },
    data: { calendarEventId: null },
  });

  return NextResponse.json({ ok: true });
}