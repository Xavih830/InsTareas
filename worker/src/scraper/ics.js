import { inferImportance } from "./canvas.js";

export const CANVAS_BASE_URL =
  process.env.CANVAS_BASE_URL || "https://aulavirtual.espol.edu.ec";

// ---- Helpers RFC 5545 ----

function unfold(text) {
  return text.replace(/[\r\n]+[ \t]+/g, "");
}

function unescapeText(s) {
  return s
    .replace(/\\\\/g, "\\")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\n/g, "\n");
}

// Devuelve {valor, params} de la primera línea con el nombre dado.
function firstProp(event, name) {
  const lines = event.split(/\r?\n/);
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const head = line.slice(0, i);
    const baseName = head.split(";")[0];
    if (baseName !== name) continue;
    const params = {};
    for (const p of head.split(";").slice(1)) {
      const eq = p.indexOf("=");
      if (eq !== -1) params[p.slice(0, eq)] = p.slice(eq + 1);
    }
    return { value: line.slice(i + 1), params };
  }
  return null;
}

// ---- Feed del calendario de Canvas ----

export function parseCalendarFeed(icsText) {
  const unfolded = unfold(icsText.replace(/\r\n/g, "\n"));
  return unfolded.split("BEGIN:VEVENT").slice(1);
}

// Fecha de vencimiento de un VEVENT. Para asignaciones, DTSTART es el due_at.
// Las de "todo el día" (VALUE=DATE) se sirven en la fecha local (América/Guayaquil,
// UTC-5 sin horario de verano): la tarea vence a las 23:59 de esa fecha local.
export function calendarEventDueDate(event) {
  const ds = firstProp(event, "DTSTART");
  if (!ds) return null;
  const { value, params } = ds;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00", z] = m;
  if (params.VALUE === "DATE") {
    return new Date(`${y}-${mo}-${d}T23:59:59-05:00`);
  }
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}-05:00`);
}

export function icsToTask(event, courses) {
  const uid = (firstProp(event, "UID")?.value || "").trim();
  const summary = unescapeText(firstProp(event, "SUMMARY")?.value || "Sin título").trim();
  const dueDate = calendarEventDueDate(event);
  if (!dueDate) return null;
  const description = firstProp(event, "DESCRIPTION");
  const descriptionText = description
    ? unescapeText(description.value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000)
    : null;

  const assignmentMatch = uid.match(/event-assignment-(\d+)/);
  const externalId = assignmentMatch ? `assign-${assignmentMatch[1]}` : `evt-${uid}`;

  const courseLink = (descriptionText || "").match(/courses\/(\d+)/);
  const courseId = courseLink ? courseLink[1] : null;
  const courseName = courseId ? (courses.get(courseId) || courseId) : "Sin curso";

  const sourceUrl =
    assignmentMatch && courseId
      ? `${CANVAS_BASE_URL}/courses/${courseId}/assignments/${assignmentMatch[1]}`
      : null;

  return {
    externalId,
    title: summary,
    course: courseName,
    dueDate,
    description: descriptionText,
    sourceUrl,
    importance: inferImportance(summary),
  };
}