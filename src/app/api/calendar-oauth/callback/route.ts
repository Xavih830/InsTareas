import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { calendarBaseUrl } from "@/lib/calendar-url";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `Google denegó el acceso: ${error}` }, { status: 400 });
  }
  if (!code) return NextResponse.json({ error: "Falta el código de autorización" }, { status: 400 });
  if (state !== session.userId) {
    return NextResponse.json({ error: "Estado OAuth inválido" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Configuración de Google incompleta" }, { status: 500 });
  }

  const redirectUri = `${calendarBaseUrl(new URL(request.url).origin)}/api/calendar-oauth/callback`;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Intercambio de token falló: ${body}` }, { status: 500 });
  }

  const data = await res.json();
  if (!data.refresh_token) {
    return NextResponse.json(
      { error: "Google no devolvió refresh_token (usa prompt=consent y access_type=offline)" },
      { status: 500 }
    );
  }

  await db.calendarConnection.upsert({
    where: { userId_provider: { userId: session.userId, provider: "google" } },
    update: {
      refreshToken: encryptSecret(data.refresh_token),
      accessToken: encryptSecret(data.access_token),
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      connectedAt: new Date(),
    },
    create: {
      userId: session.userId,
      provider: "google",
      refreshToken: encryptSecret(data.refresh_token),
      accessToken: encryptSecret(data.access_token),
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    },
  });

  return NextResponse.redirect(new URL("/dashboard?connected=google", request.url));
}
