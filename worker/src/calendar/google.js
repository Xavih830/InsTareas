import { decryptSecret, encryptSecret } from "../crypto.js";
import { prisma } from "../db.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/calendar/v3";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET no están definidas");
  }
  return { clientId, clientSecret };
}

export async function googleTokenExchange(body) {
  const { clientId, clientSecret } = googleConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange ${res.status}: ${err}`);
  }
  return res.json();
}

// Obtiene un access_token válido para la conexión del usuario (refresh si expiró).
export async function getGoogleAccessToken(connection) {
  const now = Date.now();
  if (connection.expiresAt && connection.accessToken && connection.expiresAt.getTime() > now + 60_000) {
    return decryptSecret(connection.accessToken);
  }
  const refreshToken = decryptSecret(connection.refreshToken);
  const data = await googleTokenExchange({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  if (!data.access_token) throw new Error("Google no devolvió access_token al refrescar");

  await prisma.calendarConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptSecret(data.access_token),
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    },
  });
  return data.access_token;
}

export async function googleApi(path, connection, init = {}) {
  const token = await getGoogleAccessToken(connection);
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    throw new Error("Credenciales de Google inválidas o revocadas");
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar API ${res.status} para ${path}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function listGoogleEvents(connection, calendarId) {
  const path = `/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&maxResults=2500`;
  const data = await googleApi(path, connection);
  return data.items ?? [];
}

export async function insertGoogleEvent(connection, calendarId, event) {
  return googleApi(`/calendars/${encodeURIComponent(calendarId)}/events`, connection, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function updateGoogleEvent(connection, calendarId, eventId, event) {
  return googleApi(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    connection,
    { method: "PUT", body: JSON.stringify(event) }
  );
}

export async function deleteGoogleEvent(connection, calendarId, eventId) {
  return googleApi(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    connection,
    { method: "DELETE" }
  );
}

// Convierte una tarea en el cuerpo de evento de Google Calendar (estilo ICS).
export function taskToGoogleEvent(task) {
  const start = task.dueDate;
  const end = new Date(start.getTime() + 3600 * 1000);
  return {
    summary: task.title,
    description: [task.course, task.description].filter(Boolean).join("\n\n") || undefined,
    start: { dateTime: start.toISOString(), timeZone: "UTC" },
    end: { dateTime: end.toISOString(), timeZone: "UTC" },
    ...(task.sourceUrl ? { source: { title: "Ver en Aula Virtual", url: task.sourceUrl } } : {}),
  };
}
