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

export async function getCourses(token) {
  const courses = await canvasApi("/courses?enrollment_state=active", token);
  const map = new Map();
  for (const c of courses) {
    if (c.id && c.name) map.set(String(c.id), c.name);
  }
  return map;
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
  const assignment = event.assignment;
  const title = assignment?.name || event.title || "Sin título";
  const dueDate = assignment?.due_at || event.start_at;
  if (!dueDate) return null;

  return {
    externalId: assignment ? `assign-${assignment.id}` : `evt-${event.id}`,
    title,
    course: courses.get(String(event.course_id)) || "Sin curso",
    dueDate: new Date(dueDate),
    description: assignment?.description ? stripHtml(assignment.description) : null,
    sourceUrl: assignment?.html_url || event.html_url || null,
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
