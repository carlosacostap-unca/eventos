import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ access: vi.fn(), page: vi.fn(), groups: vi.fn() }));
vi.mock("@/lib/auth/event-access", () => ({ requireEventAccess: mocks.access }));
vi.mock("@/lib/services/events", () => ({ getEventById: async () => ({ id: "event", titulo: "Jornada", cupo: 100 }) }));
vi.mock("@/lib/services/modalities", () => ({ listModalities: async () => [{ id: "expo", nombre: "Expositor" }], publicModalities: async () => [], modalityVersion: vi.fn() }));
vi.mock("@/lib/services/modal-registration", () => ({ eventExhibitions: mocks.groups }));
vi.mock("@/lib/services/registrations", () => ({ listRegistrationsPage: mocks.page, countPublicRegistrations: async () => 1, countOccupiedPlaces: async () => 1 }));
vi.mock("@/app/actions/registrations", () => ({ toggleAttendanceAction: async () => {} }));
vi.mock("@/components/event-admin-nav", () => ({ EventAdminNav: () => null }));
vi.mock("@/components/walk-in-form", () => ({ WalkInForm: () => null }));
vi.mock("@/components/registration-edit-form", () => ({ RegistrationEditForm: () => null }));
vi.mock("@/components/submit-button", () => ({ SubmitButton: ({ children }: { children: React.ReactNode }) => React.createElement("button", { type: "submit" }, children) }));
import AccreditationPage from "./page";

beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("React", React);
  mocks.access.mockResolvedValue({ eventRole: "acreditador" });
  mocks.page.mockResolvedValue({ items: [{ id: "second", evento: "event", nombres: "Segunda", apellidos: "Alumna", documento: "33333333", email: "segunda@example.com", modalidad: "expo", tipo_alta: "vinculada", origen: "publica", acreditado: false }], page: 1, totalItems: 1, totalPages: 1 });
  mocks.groups.mockResolvedValue({ exhibitions: [], members: [{ id: "link", participante: "second", exposicion: "group", funcion: "segundo_expositor", etiqueta: "Segundo alumno expositor" }] });
});

it.each(["acreditador", "administrador_evento"])("muestra al segundo alumno con su función y botón de acreditación para %s", async (role) => {
  mocks.access.mockResolvedValue({ eventRole: role });
  const html = renderToStaticMarkup(await AccreditationPage({ params: Promise.resolve({ id: "event" }), searchParams: Promise.resolve({ role: "segundo_expositor" }) }));
  expect(html).toContain("Alumna, Segunda");
  expect(html).toContain("Segundo alumno expositor");
  expect(html).toContain("Acreditar");
  expect(html).toContain('name="registrationId" value="second"');
  expect(mocks.page).toHaveBeenCalledWith("event", expect.objectContaining({ role: "segundo_expositor" }), 1, 40);
  if (role === "acreditador") expect(html).not.toContain("Ver exposición");
});
