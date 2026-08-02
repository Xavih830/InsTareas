export const CANVAS_BASE_URL =
  process.env.CANVAS_BASE_URL || "https://aulavirtual.espol.edu.ec";

export async function canvasApi(path, token, perPage = 100) {
  const url = new URL(`${CANVAS_BASE_URL}/api/v1${path}`);
  url.searchParams.set("per_page", String(perPage));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new CanvasAuthError("Token de Canvas inválido o revocado (401)");
  }
  if (!res.ok) {
    throw new Error(`Canvas API ${res.status} para ${path}`);
  }
  return res.json();
}

export class CanvasAuthError extends Error {}

export async function getUpcomingEvents(token) {
  return canvasApi("/users/self/upcoming_events", token);
}

export async function getFutureAssignments(token, courses) {
  const all = [];
  for (const courseId of courses.keys()) {
    const assignments = await canvasApi(`/courses/${courseId}/assignments?bucket=future`, token);
    for (const a of assignments) {
      if (a.id != null && a.due_at) all.push(a);
    }
  }
  return all;
}

export async function getCourses(token) {
  const courses = await canvasApi("/courses?enrollment_state=active", token);
  const map = new Map();
  for (const c of courses) {
    if (c.id && c.name) map.set(String(c.id), c.name);
  }
  return map;
}

// Combina eventos de upcoming_events (ventana corta) con asignaciones
// futuras por curso (horizonte completo), deduplicando por id de assignment.
export function mergeEvents(upcoming, assignments) {
  const seen = new Set();
  const merged = [];
  for (const e of [...upcoming, ...assignments]) {
    const a = e.assignment ?? e;
    const key = a.id ?? e.id;
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    merged.push(e);
  }
  return merged;
}

export function inferImportance(title) {
  const t = title.toLowerCase();
  if (
    /examen|evaluacion|evaluación|proyecto final|parcial|final|defensa|sustentación|sustentacion/i.test(
      t
    )
  ) {
    return "ALTA";
  }
  if (/foro|tarea corta|handout|lectura|quiz corto|participación|participacion/i.test(t)) {
    return "BAJA";
  }
  return "MEDIA";
}

export function toTask(event, courses) {
  const a = event.assignment ?? event;
  const title = a.name || event.title || "Sin título";
  const dueDate = a.due_at || event.start_at;
  if (!dueDate) return null;

  return {
    externalId: a.id != null ? `assign-${a.id}` : `evt-${event.id}`,
    title,
    course:
      courses.get(String(a.course_id ?? event.course_id)) ||
      event.context_name ||
      "Sin curso",
    dueDate: new Date(dueDate),
    description: a.description ? stripHtml(a.description) : null,
    sourceUrl: a.html_url || event.html_url || null,
    importance: inferImportance(title),
  };
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

export function priorityScore(dueDate, importance, status) {
  if (status === "COMPLETADA") return 0;
  const daysLeft = (dueDate.getTime() - Date.now()) / 86_400_000;
  const urgency = Math.max(0, Math.min(1, 1 - daysLeft / 14));
  const weight = { BAJA: 0.5, MEDIA: 1, ALTA: 1.5 }[importance] ?? 1;
  return Math.round(urgency * weight * 1000) / 1000;
}
