"use server";

import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { createSession, deleteSession, getSession } from "@/lib/session";

export type AuthState = { error?: string } | undefined;

export async function register(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const espolUsername = String(formData.get("espolUsername") || "").trim();
  const espolToken = String(formData.get("espolToken") || "").trim();

  if (!email || !password || !espolUsername || !espolToken) {
    return { error: "Todos los campos son obligatorios" };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Ya existe una cuenta con ese correo" };

  const user = await db.user.create({
    data: {
      email,
      espolUsername,
      espolPassword: encryptSecret(password),
      espolToken: encryptSecret(espolToken),
      passwordHash: await hash(password, 12),
    },
  });

  await createSession({ userId: user.id, email: user.email });
  redirect("/");
}

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return { error: "Correo o contraseña incorrectos" };

  const valid = await compare(password, user.passwordHash);
  if (!valid) return { error: "Correo o contraseña incorrectos" };

  await createSession({ userId: user.id, email: user.email });
  redirect("/");
}

export async function signout() {
  await deleteSession();
  redirect("/login");
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
