import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [calConnections, user] = await Promise.all([
    db.calendarConnection.findMany({ where: { userId: session.userId } }),
    db.user.findUnique({ where: { id: session.userId }, select: { espolUsername: true, espolPassword: true, espolSession: true, espolToken: true } }),
  ]);

  return NextResponse.json({
    calendar: calConnections.map((c) => ({ provider: c.provider, connectedAt: c.connectedAt })),
    canvas: {
      connected: Boolean(user?.espolPassword || user?.espolToken),
      username: user?.espolUsername ?? null,
      usingSession: Boolean(user?.espolSession && !user?.espolToken),
      usingToken: Boolean(user?.espolToken),
    },
  });
}