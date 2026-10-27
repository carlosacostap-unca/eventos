import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), save: vi.fn(), copy: vi.fn(), register: vi.fn(), edit: vi.fn() }));
vi.mock("@/lib/auth/event-access", () => ({ requireEventAccess: mocks.admin }));
vi.mock("@/lib/services/modalities", () => ({ saveModality: mocks.save, copyModalities: mocks.copy }));
vi.mock("@/lib/services/modal-registration", () => ({ registerWithModality: mocks.register }));
vi.mock("@/lib/services/exhibition-edit", () => ({ updateExhibition: mocks.edit }));
vi.mock("@/lib/services/events", () => ({ getEventById: async () => ({ slug: "jornada" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { copyModalitiesAction, saveModalityAction, registerConfiguredAction, updateExhibitionAction } from "./modalities";
beforeEach(() => { vi.resetAllMocks(); mocks.admin.mockRejectedValue(new Error("Sin sesión")); });
it("exige sesión dentro de cada mutación administrativa", async () => {
  await expect(saveModalityAction("event", {}, new FormData())).rejects.toThrow("Sin sesión");
  await expect(copyModalitiesAction("event", {}, new FormData())).rejects.toThrow("Sin sesión");
  await expect(updateExhibitionAction("event", "group", {}, new FormData())).rejects.toThrow("Sin sesión");
  await expect(registerConfiguredAction("event", true, {}, new FormData())).rejects.toThrow("Sin sesión");
  expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.copy).not.toHaveBeenCalled(); expect(mocks.register).not.toHaveBeenCalled(); expect(mocks.edit).not.toHaveBeenCalled();
});
it("el alta pública no admite un payload inválido ni requiere sesión", async () => {
  expect((await registerConfiguredAction("event", false, {}, new FormData())).ok).not.toBe(true);
  expect(mocks.register).not.toHaveBeenCalled(); expect(mocks.admin).not.toHaveBeenCalled();
});

it("el acreditador no puede forzar una excepción de cupo", async () => {
  mocks.admin.mockResolvedValue({ adminId: "staff", role: "personal", eventRole: "acreditador" });
  const data = new FormData(); data.set("payload", "{}"); data.set("confirmarExcepcion", "on");
  await registerConfiguredAction("event", true, {}, data);
  expect(mocks.admin).toHaveBeenCalledWith("event", "accredit");
  expect(mocks.register).toHaveBeenCalledWith("event", {}, expect.objectContaining({ allowOverCapacity: false, strictCapacity: true }));
});

it("envía el permiso de edición pública y confirma la actualización", async () => {
  const data = new FormData(); data.set("payload", "{}"); data.set("editToken", "signed");
  expect(await registerConfiguredAction("event", false, {}, data)).toMatchObject({ ok: true, message: expect.stringContaining("actualizada") });
  expect(mocks.register).toHaveBeenCalledWith("event", {}, expect.objectContaining({ editToken: "signed", presencial: false }));
  expect(mocks.admin).not.toHaveBeenCalled();
});

it("exige autorización sobre el origen al copiar modalidades", async () => {
  mocks.admin.mockResolvedValueOnce({ adminId: "staff" }).mockRejectedValueOnce(new Error("Origen ajeno"));
  const data = new FormData(); data.set("origen", "other");
  await expect(copyModalitiesAction("event", {}, data)).rejects.toThrow("Origen ajeno");
  expect(mocks.admin).toHaveBeenNthCalledWith(2, "other"); expect(mocks.copy).not.toHaveBeenCalled();
});
