import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son obligatorios" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.userId },
    data: {
      espolUsername: username,
      espolPassword: encryptSecret(password),
      espolSession: null, // fuerza un login OIDC nuevo con el próximo sync
      requiresReauth: false,
    },
  });

  return NextResponse.json({ ok: true });
}
