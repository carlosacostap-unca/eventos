import { beforeEach, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/domain/errors";

const mocks = vi.hoisted(() => ({ access: vi.fn(), find: vi.fn(), confirm: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/event-access", () => ({ requireEventAccess: mocks.access }));
vi.mock("@/lib/services/accreditation", () => ({ findAccreditationPerson: mocks.find, confirmAccreditation: mocks.confirm }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { lookupAccreditationAction, confirmAccreditationAction } from "./accreditation";

const person = { id: "person", nombres: "Ana", apellidos: "Pérez", documento: "12345678", email: "ana@example.com", acreditado: false };
function form() { const data = new FormData(); for (const key of ["nombres", "apellidos", "documento", "email"] as const) data.set(key, person[key]); return data; }
beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue({ adminId: "operator", eventRole: "acreditador" }); });

it.each(["acreditador", "administrador_evento"])("permite buscar y confirmar con permiso de acreditación para %s", async (eventRole) => {
  mocks.access.mockResolvedValue({ adminId: "operator", eventRole });
  mocks.find.mockResolvedValue(person);
  expect(await lookupAccreditationAction("event", "12.345.678")).toEqual({ document: "12345678", person });
  expect((await confirmAccreditationAction("event", "person", {}, form())).ok).toBe(true);
  expect(mocks.access.mock.calls).toEqual([["event", "accredit"], ["event", "accredit"]]);
  expect(mocks.find).toHaveBeenCalledWith("event", "12345678");
  expect(mocks.confirm).toHaveBeenCalledWith("event", "person", expect.objectContaining({ nombres: "Ana" }), "operator");
});
it("deniega búsqueda y confirmación sin acceso al evento", async () => {
  mocks.access.mockRejectedValue(new Error("NOT_FOUND"));
  await expect(lookupAccreditationAction("other", "12345678")).rejects.toThrow("NOT_FOUND");
  await expect(confirmAccreditationAction("other", "person", {}, form())).rejects.toThrow("NOT_FOUND");
  expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.confirm).not.toHaveBeenCalled();
});
it.each(["123", "abcde", "12345abc", "12345678901", "", ". . ."])("rechaza DNI inválido %j antes de consultar", async (document) => {
  expect((await lookupAccreditationAction("event", document)).message).toBeTruthy();
  expect(mocks.find).not.toHaveBeenCalled();
});
it("permite alta solamente cuando la consulta terminó sin coincidencia", async () => {
  mocks.find.mockResolvedValue(null);
  expect(await lookupAccreditationAction("event", "12345678")).toEqual({ document: "12345678" });
  mocks.find.mockRejectedValue(new Error("offline"));
  const result = await lookupAccreditationAction("event", "12345678");
  expect(result.document).toBeUndefined(); expect(result.message).toContain("conexión");
});
it("no acredita datos inválidos y muestra errores por campo", async () => {
  const data = form(); data.set("email", "incorrecto");
  expect((await confirmAccreditationAction("event", "person", {}, data)).fields?.email).toBeDefined();
  expect(mocks.confirm).not.toHaveBeenCalled();
});
it("no anuncia éxito ni revalida si encuentra un DNI duplicado", async () => {
  mocks.confirm.mockRejectedValue(new DomainError("DUPLICATE", "DNI ocupado"));
  expect(await confirmAccreditationAction("event", "person", {}, form())).toEqual({ message: "DNI ocupado" });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("actualiza las vistas del evento después de confirmar", async () => {
  await confirmAccreditationAction("event", "person", {}, form());
  for (const suffix of ["", "/acreditacion", "/acreditacion/listado", "/inscritos", "/reportes", "/certificados"]) expect(mocks.revalidate).toHaveBeenCalledWith("/admin/eventos/event" + suffix);
});
