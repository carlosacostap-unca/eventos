import { expect, it } from "vitest";
import { deadlinePassed, formatDeadline, parseArgentinaDeadline } from "./modality-deadlines";

it("incluye todo el último minuto de Argentina y guarda la fecha UTC correcta", () => {
  expect(parseArgentinaDeadline("2026-10-28T23:59")).toBe("2026-10-29T02:59:59.999Z");
  expect(parseArgentinaDeadline("2026-11-02T23:59")).toBe("2026-11-03T02:59:59.999Z");
  expect(parseArgentinaDeadline("")).toBe("");
});
it("acepta hasta el último milisegundo y cierra al comenzar el día siguiente", () => {
  const cutoff = parseArgentinaDeadline("2026-10-28T23:59");
  expect(deadlinePassed(cutoff, new Date("2026-10-29T02:59:00Z"))).toBe(false);
  expect(deadlinePassed(cutoff, new Date("2026-10-29T02:59:59.999Z"))).toBe(false);
  expect(deadlinePassed(cutoff, new Date("2026-10-29T03:00:00Z"))).toBe(true);
});
it("mantiene la entrega abierta después de cerrar inscripciones y la cierra al vencer su propio plazo", () => {
  const registration = parseArgentinaDeadline("2026-10-28T23:59");
  const presentations = parseArgentinaDeadline("2026-11-02T23:59");
  const between = new Date("2026-10-30T12:00:00Z");
  expect(deadlinePassed(registration, between)).toBe(true);
  expect(deadlinePassed(presentations, between)).toBe(false);
  expect(deadlinePassed(presentations, new Date("2026-11-03T02:59:59.999Z"))).toBe(false);
  expect(deadlinePassed(presentations, new Date("2026-11-03T03:00:00Z"))).toBe(true);
});
it("respeta modalidades sin plazos y rechaza un plazo corrupto", () => {
  expect(deadlinePassed()).toBe(false); expect(deadlinePassed("")).toBe(false);
  expect(deadlinePassed("invalid")).toBe(true);
  expect(() => parseArgentinaDeadline("invalid")).toThrow();
});
it("muestra la fecha y hora de Argentina", () => {
  expect(formatDeadline("2026-11-03T02:59:59.999Z")).toMatch(/2\/11\/26.*23:59/);
});
