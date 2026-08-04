import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toIcs } from "@/features/calendar/ics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const tasks = await db.task.findMany({
    where: { userId, status: { not: "COMPLETADA" } },
    orderBy: { dueDate: "asc" },
  });

  const dto = tasks.map((t) => ({
    id: t.id,
    externalId: t.externalId,
    title: t.title,
    course: t.course,
    dueDate: t.dueDate.toISOString(),
    description: t.description,
    sourceUrl: t.sourceUrl,
    importance: t.importance,
    priorityScore: t.priorityScore,
    status: t.status,
  }));

  const body = toIcs(dto);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="instareas.ics"',
      "Content-Length": String(Buffer.byteLength(body)),
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}
