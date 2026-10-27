import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { EventRecord } from "@/lib/domain/models";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ events: vi.fn(), types: vi.fn(), staff: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/services/events", () => ({ listPublishedEvents: mocks.events }));
vi.mock("@/lib/services/event-types", () => ({ listEventTypes: mocks.types }));
vi.mock("@/lib/services/registrations", () => ({ countPublicRegistrations: mocks.count }));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedStaff: mocks.staff }));
vi.mock("next/image", () => ({ default: () => React.createElement("span", null, "Identidad institucional") }));
import Home from "./page";

const event: EventRecord = { id: "next", titulo: "Actividad próxima", descripcion: "Una actividad de prueba", slug: "actividad", inicio: "2026-10-28T14:00:00Z", fin: "2026-10-28T16:00:00Z", lugar: "Auditorio", estado: "publicado", inscripcion_habilitada: true, cupo: 100, created: "", updated: "" };
const past = { ...event, id: "past", titulo: "Actividad anterior", fin: "2026-10-27T14:59:59Z" };
const ongoing = { ...event, id: "ongoing", titulo: "Actividad en curso", inicio: "2026-10-27T14:00:00Z", fin: "2026-10-27T16:00:00Z" };
async function html() { return renderToStaticMarkup(await Home()); }

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T15:00:00Z"));
  mocks.events.mockResolvedValue([past, ongoing, event]);
  mocks.types.mockResolvedValue([]);
  mocks.staff.mockResolvedValue(null);
  mocks.count.mockResolvedValue(0);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("muestra solo eventos vigentes a anónimos y omite los anteriores antes de consultar su cupo", async () => {
  const output = await html();
  expect(output).toContain(ongoing.titulo);
  expect(output).toContain(event.titulo);
  expect(output).not.toContain(past.titulo);
  expect(output).not.toContain('value="finalizado"');
  expect(mocks.count.mock.calls.map(([id]) => id)).toEqual([ongoing.id, event.id]);
});

it("conserva los eventos con inscripción cerrada o cupo completo mientras no hayan terminado", async () => {
  mocks.events.mockResolvedValue([{ ...event, inscripcion_habilitada: false }, { ...ongoing, cupo: 1 }]);
  mocks.count.mockResolvedValue(1);
  const output = await html();
  expect(output).toContain(event.titulo);
  expect(output).toContain(ongoing.titulo);
  expect(output).toContain("Inscripción cerrada");
  expect(output).toContain("Cupo completo");
});

it("muestra un estado vacío al finalizar el último evento y mantiene el acceso a certificados", async () => {
  mocks.events.mockResolvedValue([{ ...past, fin: new Date().toISOString() }, { ...event, estado: "finalizado" }]);
  const output = await html();
  expect(output).toContain("No hay eventos próximos o en curso");
  expect(output).toContain('href="/mis-certificados"');
  expect(output).toContain('href="/validar-certificado"');
  expect(output).not.toContain('class="event-card"');
  expect(mocks.count).not.toHaveBeenCalled();
});

it("mantiene la agenda anterior para el personal autenticado", async () => {
  mocks.staff.mockResolvedValue({ adminId: "admin", role: "admin" });
  const output = await html();
  expect(output).toContain(past.titulo);
  expect(output).toContain(ongoing.titulo);
  expect(output).toContain(event.titulo);
  expect(output).toContain('value="finalizado"');
});
