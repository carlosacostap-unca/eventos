import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), upload: vi.fn(), delete: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/lib/services/materials", () => ({ uploadMaterial: mocks.upload, deleteMaterial: mocks.delete }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { uploadMaterialAction, deleteMaterialAction } from "./materials";

beforeEach(() => { vi.resetAllMocks(); mocks.admin.mockResolvedValue({ adminId: "admin" }); });
it("exige sesión para subir y eliminar", async () => {
  mocks.admin.mockRejectedValue(new Error("Unauthorized"));
  await expect(uploadMaterialAction("event", {}, new FormData())).rejects.toThrow("Unauthorized");
  await expect(deleteMaterialAction("event", "file")).rejects.toThrow("Unauthorized");
  expect(mocks.upload).not.toHaveBeenCalled();
  expect(mocks.delete).not.toHaveBeenCalled();
});
it("sube un archivo y revalida administración y portal", async () => {
  const data = new FormData();
  data.set("archivo", new File(["pdf"], "charla.pdf"));
  expect((await uploadMaterialAction("event", {}, data)).ok).toBe(true);
  expect(mocks.upload).toHaveBeenCalledWith("event", "", expect.any(File), "admin");
  expect(mocks.revalidate).toHaveBeenCalledWith("/mis-certificados/resultados");
});
