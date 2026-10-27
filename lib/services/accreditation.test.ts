import { ClientResponseError } from "pocketbase";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getOne: vi.fn(), getFirstListItem: vi.fn(), getList: vi.fn(), update: vi.fn(), audit: vi.fn(), filter: vi.fn(), owned: vi.fn(), lock: vi.fn() }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => ({ filter: mocks.filter, collection: () => mocks }) }));
vi.mock("./audit", () => ({ audit: mocks.audit }));
vi.mock("./operation-lock", () => ({ withOperationLock: mocks.lock }));
import { findAccreditationPerson, confirmAccreditation } from "./accreditation";
const input = { nombres: "Ana", apellidos: "Pérez", documento: "12345678", email: "ana@example.com" };
const current = { ...input, id: "person", evento: "event", modalidad: "expo", respuestas: { titulo: "Trabajo" }, acreditado: false };
beforeEach(() => {
  vi.resetAllMocks(); mocks.getOne.mockResolvedValue(current); mocks.getList.mockResolvedValue({ totalItems: 0 });
  mocks.lock.mockImplementation(async (_pb, _key, run) => run(mocks.owned));
});
it("busca el DNI exacto en el evento y devuelve únicamente los campos de revisión", async () => {
  await findAccreditationPerson("event", "12.345.678");
  expect(mocks.filter).toHaveBeenCalledWith("evento = {:eventId} && documento_normalizado = {:document}", { eventId: "event", document: "12345678" });
  expect(mocks.getFirstListItem).toHaveBeenCalledWith(undefined, { fields: "id,nombres,apellidos,documento,email,acreditado,acreditado_en" });
});
it("distingue una persona ausente de una falla de base de datos", async () => {
  mocks.getFirstListItem.mockRejectedValue(new ClientResponseError({ status: 404 }));
  expect(await findAccreditationPerson("event", input.documento)).toBeNull();
  mocks.getFirstListItem.mockRejectedValue(new ClientResponseError({ status: 503 }));
  await expect(findAccreditationPerson("event", input.documento)).rejects.toMatchObject({ status: 503 });
});
it("guarda corrección y asistencia juntas sin tocar modalidad, respuestas o cupo", async () => {
  await confirmAccreditation("event", "person", { ...input, nombres: "Ana María" }, "staff");
  expect(mocks.lock).toHaveBeenCalledWith(expect.anything(), "evento:event", expect.any(Function));
  expect(mocks.owned).toHaveBeenCalled();
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith("person", { ...input, nombres: "Ana María", documento_normalizado: "12345678", acreditado: true, acreditado_en: expect.any(String), acreditado_por: "staff" });
  expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ adminId: "staff", action: "asistencia.acreditada", data: { evento: "event", campos: ["nombres"] } }));
});
it("rechaza IDs pertenecientes a otro evento", async () => {
  await expect(confirmAccreditation("other", "person", input, "staff")).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(mocks.update).not.toHaveBeenCalled();
});
it("no duplica una llegada ya acreditada", async () => {
  mocks.getOne.mockResolvedValue({ ...current, acreditado: true, acreditado_por: "original", acreditado_en: "2026-10-27T12:00:00Z" });
  await confirmAccreditation("event", "person", input, "staff");
  expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled();
});
it("permite corregir una persona acreditada conservando fecha y operador original", async () => {
  mocks.getOne.mockResolvedValue({ ...current, acreditado: true });
  await confirmAccreditation("event", "person", { ...input, nombres: "Ana María" }, "staff");
  const data = mocks.update.mock.calls[0][1];
  expect(data.acreditado_en).toBeUndefined(); expect(data.acreditado_por).toBeUndefined();
  expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "inscripcion.editada" }));
});
it("no actualiza ni acredita un DNI duplicado", async () => {
  mocks.getList.mockResolvedValue({ totalItems: 1 });
  await expect(confirmAccreditation("event", "person", input, "staff")).rejects.toMatchObject({ code: "DUPLICATE" });
  expect(mocks.update).not.toHaveBeenCalled();
});
it("no guarda si falla la consulta de duplicados o se pierde el bloqueo", async () => {
  mocks.getList.mockRejectedValueOnce(new Error("offline"));
  await expect(confirmAccreditation("event", "person", input, "staff")).rejects.toThrow("offline");
  mocks.owned.mockRejectedValueOnce(new Error("expired"));
  await expect(confirmAccreditation("event", "person", input, "staff")).rejects.toThrow("expired");
  expect(mocks.update).not.toHaveBeenCalled();
});
it("traduce un conflicto de DNI que sucede al guardar", async () => {
  mocks.update.mockRejectedValue(new ClientResponseError({ status: 400, response: { data: { documento_normalizado: { code: "validation_not_unique" } } } }));
  await expect(confirmAccreditation("event", "person", input, "staff")).rejects.toMatchObject({ code: "DUPLICATE" });
  expect(mocks.audit).not.toHaveBeenCalled();
});
