import { ClientResponseError } from "pocketbase";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getOne: vi.fn(), getList: vi.fn(), update: vi.fn(), audit: vi.fn(), filter: vi.fn() }));
vi.mock("@/lib/services/events", () => ({ getEventById: vi.fn() }));
vi.mock("@/lib/services/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/pocketbase/client", () => ({
  createServicePocketBase: async () => ({
    filter: mocks.filter,
    collection: () => mocks,
  }),
}));

import { updateRegistration } from "./registrations";

const input = { nombres: " Ana ", apellidos: " Pérez ", documento: "12.345.678", email: " ANA@example.com " };
const current = { id: "person", evento: "event", nombres: "Analia", apellidos: "Peres", documento: "12345679", email: "old@example.com", acreditado: true, origen: "publica", numero_cupo_publico: 4 };

describe("corrección de datos durante la acreditación", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getOne.mockResolvedValue(current);
    mocks.getList.mockResolvedValue({ totalItems: 0 });
    mocks.update.mockImplementation(async (_id, data) => ({ ...current, ...data }));
  });

  it("normaliza los datos y conserva asistencia, origen y cupo", async () => {
    const result = await updateRegistration("event", "person", input, "admin");
    expect(mocks.update).toHaveBeenCalledWith("person", {
      nombres: "Ana", apellidos: "Pérez", documento: "12.345.678", documento_normalizado: "12345678", email: "ana@example.com",
    });
    expect(result).toMatchObject({ acreditado: true, origen: "publica", numero_cupo_publico: 4 });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ adminId: "admin", action: "inscripcion.editada", entityId: "person" }));
    expect(mocks.filter).toHaveBeenCalledWith(
      "evento = {:eventId} && documento_normalizado = {:documento} && id != {:registrationId}",
      { eventId: "event", documento: "12345678", registrationId: "person" },
    );
  });

  it("permite mantener el DNI propio", async () => {
    mocks.getOne.mockResolvedValue({ ...current, documento_normalizado: "12345678" });
    await expect(updateRegistration("event", "person", input, "admin")).resolves.toMatchObject({ id: "person" });
  });

  it("rechaza un DNI ocupado por otra inscripción", async () => {
    mocks.getList.mockResolvedValue({ totalItems: 1 });
    await expect(updateRegistration("event", "person", input, "admin")).rejects.toMatchObject({ code: "DUPLICATE" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("rechaza una inscripción de otro evento", async () => {
    await expect(updateRegistration("other", "person", input, "admin")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([{ ...input, email: "inválido" }, { ...input, documento: "..." }, { ...input, nombres: "" }, { ...input, apellidos: "" }])("rechaza datos inválidos: %j", async (invalid) => {
    await expect(updateRegistration("event", "person", invalid, "admin")).rejects.toMatchObject({ code: "INVALID" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("no guarda si falla la consulta de duplicados", async () => {
    mocks.getList.mockRejectedValue(new ClientResponseError({ status: 500 }));
    await expect(updateRegistration("event", "person", input, "admin")).rejects.toMatchObject({ status: 500 });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("informa un duplicado detectado al guardar por una edición concurrente", async () => {
    mocks.update.mockRejectedValue(new ClientResponseError({ status: 400, response: { data: { documento_normalizado: { code: "validation_not_unique" } } } }));
    await expect(updateRegistration("event", "person", input, "admin")).rejects.toMatchObject({ code: "DUPLICATE" });
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
