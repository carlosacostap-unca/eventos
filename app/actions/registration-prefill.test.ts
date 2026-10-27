import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ find: vi.fn(), limit: vi.fn(), event: vi.fn(), editable: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1, 10.0.0.2" }) }));
vi.mock("@/lib/services/events", () => ({ getEventById: mocks.event }));
vi.mock("@/lib/services/registration-prefill", () => ({ findRegistrationIdentity: mocks.find, allowRegistrationPrefill: mocks.limit }));
vi.mock("@/lib/services/public-registration-edit", () => ({ findEditableRegistration: mocks.editable }));
import { lookupRegistrationPersonAction } from "./registration-prefill";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.limit.mockResolvedValue(true);
  mocks.event.mockResolvedValue({ estado: "publicado", inscripcion_habilitada: true, fin: "2099-11-03T14:00:00Z" });
});

it("recupera datos solo con DNI sin solicitar email", async () => {
  const person = { nombres: "Ana", apellidos: "Pérez", documento: "12345678", email: "ana@example.com" };
  mocks.find.mockResolvedValue(person);
  expect((await lookupRegistrationPersonAction("event", "12.345.678")).person).toEqual(person);
  expect(mocks.find).toHaveBeenCalledWith("12.345.678", "event");
  expect(mocks.limit).toHaveBeenCalledWith("127.0.0.1");
  expect(mocks.editable).not.toHaveBeenCalled();
});

it("recupera la inscripción del evento solo al consultar a la persona principal", async () => {
  const registration = { token: "signed", modalidad: "expo", version: "v1", principal: { nombres: "Ana", apellidos: "Pérez", documento: "12345678", email: "ana@example.com", respuestas: { titulo: "Trabajo" } }, integrantes: [] };
  mocks.editable.mockResolvedValue(registration);
  expect(await lookupRegistrationPersonAction("event", "12.345.678", true)).toMatchObject({ person: registration.principal, registration });
  expect(mocks.editable).toHaveBeenCalledWith("12.345.678", "event");
  expect(mocks.find).not.toHaveBeenCalled();
});

it.each(["12", ".....", "a".repeat(33)])("rechaza el documento inválido %s sin consultar", async (document) => {
  expect((await lookupRegistrationPersonAction("event", document)).person).toBeUndefined();
  expect(mocks.limit).not.toHaveBeenCalled();
  expect(mocks.find).not.toHaveBeenCalled();
});

it.each([null, { estado: "borrador", inscripcion_habilitada: true, fin: "2099-01-01" }, { estado: "publicado", inscripcion_habilitada: false, fin: "2099-01-01" }, { estado: "publicado", inscripcion_habilitada: true, fin: "2020-01-01" }])("no permite buscar desde un evento no disponible", async (event) => {
  mocks.event.mockResolvedValue(event);
  expect((await lookupRegistrationPersonAction("event", "12345678")).person).toBeUndefined();
  expect(mocks.find).not.toHaveBeenCalled();
});

it("limita consultas antes de buscar personas", async () => {
  mocks.limit.mockResolvedValue(false);
  expect((await lookupRegistrationPersonAction("event", "12345678")).message).toContain("manualmente");
  expect(mocks.find).not.toHaveBeenCalled();
});

it("permite completar desde cero cuando no hay coincidencia", async () => {
  mocks.find.mockResolvedValue(null);
  expect(await lookupRegistrationPersonAction("event", "12345678")).toEqual({ message: "No encontramos datos para ese documento. Completalos para continuar." });
});

it("permite carga manual ante un error sin revelar el error interno", async () => {
  mocks.find.mockRejectedValue(new Error("sensitive connection details"));
  const result = await lookupRegistrationPersonAction("event", "12345678");
  expect(result.person).toBeUndefined();
  expect(result.message).toContain("manualmente");
  expect(JSON.stringify(result)).not.toContain("sensitive");
});
