import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { calendarBaseUrl } from "@/lib/calendar-url";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID no está configurada" },
      { status: 500 }
    );
  }

  const redirectUri = `${calendarBaseUrl(new URL(request.url).origin)}/api/calendar-oauth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state: session.userId,
  });
  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
