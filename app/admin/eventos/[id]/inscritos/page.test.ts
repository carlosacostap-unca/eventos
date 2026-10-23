import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), event: vi.fn(), names: vi.fn() }));
vi.mock("@/lib/auth/event-access", () => ({ requireEventAccess: mocks.access }));
vi.mock("@/lib/services/events", () => ({ getEventById: mocks.event }));
vi.mock("@/lib/services/registrations", () => ({ listRegistrationNames: mocks.names }));
vi.mock("@/components/event-admin-nav", () => ({ EventAdminNav: () => null }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("Not found"); } }));

import RegistrationsPage from "./page";

const page = () => RegistrationsPage({ params: Promise.resolve({ id: "event-A" }) });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("React", React);
  mocks.access.mockResolvedValue({ eventRole: "administrador_evento" });
  mocks.event.mockResolvedValue({ id: "event-A", titulo: "Actividad de prueba" });
  mocks.names.mockResolvedValue([{ id: "person", nombres: "Ana María", apellidos: "Pérez", documento: "12345678", email: "privado@example.com" }]);
});

describe("consulta de inscritos", () => {
  it("muestra únicamente el nombre de cada persona", async () => {
    const html = renderToStaticMarkup(await page());
    expect(html).toContain("Pérez, Ana María");
    expect(html).toContain("1 persona inscrita");
    expect(html).not.toContain("12345678"); expect(html).not.toContain("privado@example.com");
    expect(mocks.access).toHaveBeenCalledWith("event-A");
    expect(mocks.names).toHaveBeenCalledWith("event-A");
  });

  it("rechaza el acceso antes de consultar datos si no hay permiso de administración", async () => {
    mocks.access.mockRejectedValue(new Error("Not authorized"));
    await expect(page()).rejects.toThrow("Not authorized");
    expect(mocks.event).not.toHaveBeenCalled(); expect(mocks.names).not.toHaveBeenCalled();
  });

  it("muestra un estado vacío sin personas inscritas", async () => {
    mocks.names.mockResolvedValue([]);
    expect(renderToStaticMarkup(await page())).toContain("Todavía no hay personas inscritas en este evento.");
  });

  it("no consulta inscripciones de un evento inexistente", async () => {
    mocks.event.mockResolvedValue(null);
    await expect(page()).rejects.toThrow("Not found");
    expect(mocks.names).not.toHaveBeenCalled();
  });
});
