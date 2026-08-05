import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const courses = await db.course.findMany({
    where: { userId: session.userId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { items: { orderBy: { position: "asc" } } },
      },
    },
  });

  return NextResponse.json({ courses });
}