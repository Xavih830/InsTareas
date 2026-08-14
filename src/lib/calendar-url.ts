// URL pública base para construir el feed ICS de suscripción. El orden de
// resolución garantiza que en producción se use el dominio público real:
// 1. NEXT_PUBLIC_APP_URL (definida por el usuario, p.ej. https://mi-app.vercel.app)
// 2. NEXT_PUBLIC_VERCEL_URL (Vercel la inyecta automáticamente en el build)
// 3. origin de la petición (fallback server; `window.location.origin` en cliente)
export function calendarBaseUrl(fallbackOrigin?: string): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  const origin =
    fallbackOrigin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return origin.replace(/\/$/, "");
}

export function calendarFeedUrl(userId: string): string {
  return `${calendarBaseUrl()}/api/calendar/${userId}/ics`;
}

export function isLocalHost(): boolean {
  // SSR/prerender: `window` no existe en el servidor; en localhost dev el
  // server component solo necesita el feed URL, no la detección de entorno.
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
}
