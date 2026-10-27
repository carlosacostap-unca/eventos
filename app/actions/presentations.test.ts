import { beforeEach, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/domain/errors";
const mocks = vi.hoisted(() => ({ limit: vi.fn(), event: vi.fn(), find: vi.fn(), upload: vi.fn(), refresh: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("@/lib/services/registration-prefill", () => ({ allowRegistrationPrefill: mocks.limit }));
vi.mock("@/lib/services/events", () => ({ getEventById: mocks.event }));
vi.mock("@/lib/services/presentations", () => ({ findPresentationWorks: mocks.find, uploadExhibitionPresentation: mocks.upload }));
import { lookupPresentationsAction, uploadPresentationAction } from "./presentations";
function form() { const data = new FormData(); data.set("documento", "12345678"); return data; }
beforeEach(() => { vi.resetAllMocks(); mocks.limit.mockResolvedValue(true); mocks.event.mockResolvedValue({ estado: "publicado", inscripcion_habilitada: false }); mocks.find.mockResolvedValue({ token: "signed", works: [{ id: "work", title: "Mi trabajo", revision: "" }] }); });
it("permite consultar las entregas aunque las inscripciones estén cerradas", async () => {
  expect(await lookupPresentationsAction("event", {}, form())).toMatchObject({ ok: true, token: "signed", document: "12345678" });
  expect(mocks.find).toHaveBeenCalledWith("event", "12345678");
});
it("valida DNI, estado del evento y límite de consultas antes de buscar trabajos", async () => {
  const invalid = form(); invalid.set("documento", "..");
  expect((await lookupPresentationsAction("event", {}, invalid)).ok).not.toBe(true);
  mocks.limit.mockResolvedValueOnce(false);
  expect((await lookupPresentationsAction("event", {}, form())).ok).not.toBe(true);
  mocks.event.mockResolvedValue({ estado: "borrador" });
  expect((await lookupPresentationsAction("event", {}, form())).ok).not.toBe(true);
  expect(mocks.find).not.toHaveBeenCalled();
});
it("no presenta una falla de base de datos como un DNI sin trabajos", async () => {
  mocks.find.mockRejectedValue(new Error("offline"));
  expect((await lookupPresentationsAction("event", {}, form())).message).toContain("No pudimos consultar");
});
it("envía archivo y permisos al servicio, y actualiza Exposiciones al guardar", async () => {
  const data = form(); const file = new File(["%PDF-1.7"], "trabajo.pdf"); data.set("presentacion", file); data.set("token", "signed"); data.set("revision", "previous");
  mocks.upload.mockResolvedValue({ filename: "trabajo.pdf" });
  expect((await uploadPresentationAction("event", "work", {}, data)).ok).toBe(true);
  expect(mocks.upload).toHaveBeenCalledWith("event", "work", "12345678", "signed", "previous", expect.any(File));
  expect(mocks.refresh).toHaveBeenCalledWith("/admin/eventos/event/exposiciones");
});
it("no anuncia éxito si falta archivo o el permiso fue rechazado", async () => {
  expect((await uploadPresentationAction("event", "work", {}, form())).ok).not.toBe(true);
  const data = form(); data.set("presentacion", new File(["%PDF-1.7"], "trabajo.pdf"));
  mocks.upload.mockRejectedValue(new DomainError("UNAUTHORIZED", "No autorizado"));
  expect(await uploadPresentationAction("event", "work", {}, data)).toEqual({ message: "No autorizado" });
  expect(mocks.refresh).not.toHaveBeenCalled();
});
