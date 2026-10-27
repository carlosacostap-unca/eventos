import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ access: vi.fn(), publicCount: vi.fn(), occupied: vi.fn(), event: vi.fn() }));
vi.mock("@/lib/auth/event-access", () => ({ requireEventAccess: mocks.access }));
vi.mock("@/lib/services/events", () => ({ getEventById: mocks.event }));
vi.mock("@/lib/services/modalities", () => ({ publicModalities: async () => [] }));
vi.mock("@/lib/services/registrations", () => ({ countPublicRegistrations: mocks.publicCount, countOccupiedPlaces: mocks.occupied }));
vi.mock("@/components/quick-accreditation", () => ({ QuickAccreditation: (props: { isFull: boolean; canManage: boolean }) => React.createElement("div", { "data-full": props.isFull, "data-manage": props.canManage }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
import AccreditationPage from "./page";
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal("React", React);
  mocks.event.mockResolvedValue({ id: "event", titulo: "Jornada", cupo: 1 });
  mocks.publicCount.mockResolvedValue(0); mocks.occupied.mockResolvedValue(1);
});
it("cuenta todas las plazas ocupadas para el acreditador", async () => {
  mocks.access.mockResolvedValue({ eventRole: "acreditador" });
  const html = renderToStaticMarkup(await AccreditationPage({ params: Promise.resolve({ id: "event" }) }));
  expect(mocks.access).toHaveBeenCalledWith("event", "accredit");
  expect(html).toContain('data-full="true"'); expect(html).toContain('data-manage="false"');
  expect(mocks.publicCount).not.toHaveBeenCalled();
});
it("mantiene el control de excepciones de cupo para administradores", async () => {
  mocks.access.mockResolvedValue({ eventRole: "administrador_evento" });
  const html = renderToStaticMarkup(await AccreditationPage({ params: Promise.resolve({ id: "event" }) }));
  expect(html).toContain('data-manage="true"'); expect(html).toContain('data-full="false"');
  expect(mocks.occupied).not.toHaveBeenCalled();
});
it("rechaza un evento inexistente", async () => {
  mocks.access.mockResolvedValue({ eventRole: "administrador_evento" }); mocks.event.mockResolvedValue(null);
  await expect(AccreditationPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow("NOT_FOUND");
});
