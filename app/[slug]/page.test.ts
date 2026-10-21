import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRecord } from "@/lib/domain/models";
import { PUBLIC_EVENT_PAGE_OPTIONS } from "@/lib/domain/public-event-page";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ event: vi.fn(), types: vi.fn(), speakers: vi.fn(), count: vi.fn(), modes: vi.fn() }));
vi.mock("@/lib/services/events", () => ({ getEventBySlug: mocks.event }));
vi.mock("@/lib/services/event-types", () => ({ listEventTypes: mocks.types }));
vi.mock("@/lib/services/speakers", () => ({ listSpeakersByEvent: mocks.speakers }));
vi.mock("@/lib/services/registrations", () => ({ countPublicRegistrations: mocks.count }));
vi.mock("@/lib/services/modalities", () => ({ publicModalities: mocks.modes }));
vi.mock("next/image", () => ({ default: () => React.createElement("span", null, "Identidad institucional") }));
vi.mock("@/components/registration-form", () => ({ RegistrationForm: () => React.createElement("form", null, "Formulario de inscripción") }));
vi.mock("@/components/speaker-card", () => ({ SpeakerCard: () => React.createElement("p", null, "Ponente de prueba") }));
import PublicEventPage from "./page";

const event: EventRecord = { id: "evento", titulo: "Actividad de prueba", tipo_evento: "tipo", descripcion: "Descripción detallada de prueba", slug: "actividad", inicio: "2030-11-03T12:00:00Z", fin: "2030-11-03T14:00:00Z", lugar: "Auditorio de prueba", costo: "arancelado", cupo: 100, estado: "publicado", inscripcion_habilitada: true, created: "", updated: "" };
async function html() { return renderToStaticMarkup(await PublicEventPage({ params: Promise.resolve({ slug: event.slug }) })); }
describe("página pública por evento", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubGlobal("React", React);
    mocks.event.mockResolvedValue(event); mocks.count.mockResolvedValue(0); mocks.modes.mockResolvedValue([]);
    mocks.types.mockResolvedValue([{ id: "tipo", nombre: "Categoría de prueba" }]); mocks.speakers.mockResolvedValue([{ id: "ponente" }]);
  });
  it("mantiene el formulario abierto en un evento sin límite aunque se haya superado el cupo anterior", async () => {
    mocks.event.mockResolvedValue({ ...event, cupo_ilimitado: true });
    mocks.count.mockResolvedValue(200000);
    const output = await html();
    expect(output).toContain("Inscripción abierta"); expect(output).toContain("Formulario de inscripción"); expect(output).not.toContain("El cupo está completo");
  });
  it("omite tipo y duración del HTML, manteniendo los otros datos y la inscripción", async () => {
    mocks.event.mockResolvedValue({ ...event, pagina_publica: { tipoEvento: false, duracion: false } });
    const output = await html();
    expect(output).not.toContain("Categoría de prueba"); expect(output).not.toContain("Duración"); expect(output).not.toContain("2 horas");
    expect(output).toContain("Fecha y hora"); expect(output).toContain("Auditorio de prueba"); expect(output).toContain("Formulario de inscripción");
    expect(mocks.types).not.toHaveBeenCalled();
  });
  it("permite una página mínima sin bloques vacíos y sin consultar disertantes ocultos", async () => {
    mocks.event.mockResolvedValue({ ...event, pagina_publica: Object.fromEntries(PUBLIC_EVENT_PAGE_OPTIONS.map(({ key }) => [key, false])) });
    const output = await html();
    for (const text of ["Descripción detallada de prueba", "Fecha y hora", "Duración", "Auditorio de prueba", "Arancelada", "Se entregará", "Ponente de prueba", "<dl"]) expect(output).not.toContain(text);
    expect(output).toContain("Actividad de prueba"); expect(output).toContain("Inscripción abierta"); expect(output).toContain("Formulario de inscripción");
    expect(mocks.speakers).not.toHaveBeenCalled();
  });
  it("muestra toda la información de eventos anteriores y mantiene el cierre por cupo", async () => {
    let output = await html();
    for (const text of ["Categoría de prueba", "Duración", "2 horas", "Auditorio de prueba", "Arancelada", "Se entregará", "Ponente de prueba"]) expect(output).toContain(text);
    mocks.count.mockResolvedValue(100); output = await html();
    expect(output).toContain("El cupo está completo"); expect(output).not.toContain("Formulario de inscripción");
  });
});
