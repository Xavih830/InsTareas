import { test } from "node:test";
import assert from "node:assert/strict";
import {
  daysUntil,
  urgencyScore,
  priorityScore,
  inferImportance,
  sortByPriority,
} from "../src/lib/priority.ts";

const now = new Date("2026-08-01T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

test("tarea vencida satura la urgencia y obtiene score máximo según peso", () => {
  const score = priorityScore(days(-1), "ALTA", "PENDIENTE", now);
  assert.equal(score, 1.5);
  assert.equal(urgencyScore(daysUntil(days(-1), now)), 1);
});

test("tarea sin importancia asignada usa MEDIA por defecto", () => {
  const score = priorityScore(days(3), undefined as never, "PENDIENTE", now);
  assert.equal(score, Math.round((1 - 3 / 14) * 1000) / 1000);
});

test("tarea completada siempre tiene score 0", () => {
  assert.equal(priorityScore(days(-1), "ALTA", "COMPLETADA", now), 0);
  assert.equal(priorityScore(days(20), "ALTA", "COMPLETADA", now), 0);
});

test("fuera de la ventana de 14 días la urgencia es 0", () => {
  assert.equal(priorityScore(days(15), "ALTA", "PENDIENTE", now), 0);
  assert.equal(urgencyScore(daysUntil(days(20), now)), 0);
});

test("inferImportance detecta palabras clave", () => {
  assert.equal(inferImportance("Examen Parcial 1"), "ALTA");
  assert.equal(inferImportance("Proyecto Final"), "ALTA");
  assert.equal(inferImportance("Foro: presentación"), "BAJA");
  assert.equal(inferImportance("Tarea corta 3"), "BAJA");
  assert.equal(inferImportance("Deber semana 5"), "MEDIA");
});

test("sortByPriority ordena por score con completadas al final", () => {
  const sorted = sortByPriority([
    { priorityScore: 0.5, status: "COMPLETADA" },
    { priorityScore: 1.4, status: "PENDIENTE" },
    { priorityScore: 0.8, status: "PENDIENTE" },
    { priorityScore: 2, status: "COMPLETADA" },
  ]);
  assert.deepEqual(
    sorted.map((t) => t.priorityScore),
    [1.4, 0.8, 2, 0.5]
  );
});
