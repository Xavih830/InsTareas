import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeEvents, toTask } from "../worker/src/scraper/canvas.js";

const courses = new Map([
  ["38971", "APLICACIONES MÓVILES Y SERVICIOS TELEMÁTICOS - I PAO 2026"],
]);

test("toTask mapea un evento de upcoming_events (con assignment)", () => {
  const event = {
    id: "assignment_1100212",
    title: "Actividad 11",
    context_name: "APLICACIONES MÓVILES",
    assignment: {
      id: 1100212,
      course_id: 38971,
      name: "Actividad 11: Sensores IoT",
      due_at: "2026-08-03T04:58:00Z",
      html_url: "https://aulavirtual.espol.edu.ec/courses/38971/assignments/1100212",
      description: "<p>Entrega del código</p>",
    },
  };
  const t = toTask(event, courses);
  assert.equal(t?.externalId, "assign-1100212");
  assert.equal(t?.title, "Actividad 11: Sensores IoT");
  assert.equal(t?.course, "APLICACIONES MÓVILES Y SERVICIOS TELEMÁTICOS - I PAO 2026");
  assert.equal(t?.dueDate.toISOString(), "2026-08-03T04:58:00.000Z");
  assert.equal(t?.description, "Entrega del código");
  assert.equal(
    t?.sourceUrl,
    "https://aulavirtual.espol.edu.ec/courses/38971/assignments/1100212"
  );
});

test("toTask mapea una asignación plana de assignments?bucket=future", () => {
  const assignment = {
    id: 1057088,
    course_id: 38971,
    name: "Examen Parcial 2",
    due_at: "2026-09-15T23:59:00Z",
    html_url: "https://aulavirtual.espol.edu.ec/courses/38971/assignments/1057088",
    description: "Temario completo",
  };
  const t = toTask(assignment, courses);
  assert.equal(t?.externalId, "assign-1057088");
  assert.equal(t?.title, "Examen Parcial 2");
  assert.equal(t?.course, "APLICACIONES MÓVILES Y SERVICIOS TELEMÁTICOS - I PAO 2026");
  assert.equal(t?.dueDate.toISOString(), "2026-09-15T23:59:00.000Z");
  assert.equal(t?.importance, "ALTA");
});

test("toTask devuelve null sin fecha límite", () => {
  assert.equal(toTask({ id: 1, assignment: { id: 1, name: "Sin fecha" } }, courses), null);
});

test("mergeEvents deduplica por id de assignment y prioriza upcoming", () => {
  const upcoming = [
    {
      id: "assignment_100",
      title: "De la ventana",
      assignment: { id: 100, course_id: 38971, name: "De la ventana", due_at: "2026-08-03T00:00:00Z" },
    },
  ];
  const future = [
    {
      id: 100,
      course_id: 38971,
      name: "De la ventana",
      due_at: "2026-08-03T00:00:00Z",
    },
    {
      id: 200,
      course_id: 38971,
      name: "Examen final",
      due_at: "2026-10-01T00:00:00Z",
    },
  ];
  const merged = mergeEvents(upcoming, future);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "assignment_100");
  assert.equal(merged[1].id, 200);
});
