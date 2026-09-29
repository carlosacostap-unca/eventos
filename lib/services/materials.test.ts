import PocketBase from "pocketbase";
import { beforeEach, afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getOne: vi.fn(), getList: vi.fn(), create: vi.fn(), delete: vi.fn(), audit: vi.fn(), getToken: vi.fn(), getURL: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/services/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => ({
  filter: new PocketBase().filter, collection: () => mocks, files: { getToken: mocks.getToken, getURL: mocks.getURL },
}) }));
import { getMaterialDownload, uploadMaterial, deleteMaterial } from "./materials";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.getOne.mockResolvedValue({ id: "material", evento: "event", archivo: "file.pdf", nombre_original: "Guía.pdf" });
  mocks.getList.mockResolvedValue({ totalItems: 1 });
  mocks.getToken.mockResolvedValue("private-token");
  mocks.getURL.mockReturnValue("https://storage.example/file?token=private-token");
  mocks.fetch.mockResolvedValue(new Response("PDF"));
  mocks.create.mockResolvedValue({ id: "material" });
});
afterEach(() => vi.unstubAllGlobals());

it("sube el archivo real y los metadatos a PocketBase", async () => {
  const file = new File(["diapositivas"], "charla.pptx");
  await uploadMaterial("event", "Diapositivas", file, "admin");
  const form = mocks.create.mock.calls[0][0] as FormData;
  expect(await (form.get("archivo") as File).text()).toBe("diapositivas");
  expect(form.get("evento")).toBe("event");
  expect(form.get("nombre_original")).toBe("charla.pptx");
  expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "material.agregado", adminId: "admin" }));
});

it("descarga por inscripción acreditada del mismo evento, sin necesitar certificado", async () => {
  const download = await getMaterialDownload("material", { registrationIds: ["registration"] });
  expect(await new Response(download.body).text()).toBe("PDF");
  expect(mocks.getList).toHaveBeenCalledWith(1, 1, { filter: '((id = "registration")) && evento = "event" && acreditado = true', fields: "id" });
  expect(mocks.getURL).toHaveBeenCalledWith(expect.anything(), "file.pdf", { token: "private-token" });
  expect(download.filename).toBe("Guía.pdf");
});

it("rechaza ausencia, acreditación revocada o inscripción de otro evento antes de acceder al storage", async () => {
  mocks.getList.mockResolvedValue({ totalItems: 0 });
  await expect(getMaterialDownload("material", { registrationIds: ["other"] })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(mocks.getToken).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("rechaza acceso sin inscripciones autorizadas", async () => {
  await expect(getMaterialDownload("material", { registrationIds: [] })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(mocks.getOne).not.toHaveBeenCalled();
});

it("permite descargar al administrador", async () => {
  await getMaterialDownload("material", { admin: true });
  expect(mocks.getList).not.toHaveBeenCalled();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});

it("rechaza una eliminación con evento incorrecto", async () => {
  await expect(deleteMaterial("other", "material", "admin")).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(mocks.delete).not.toHaveBeenCalled();
});

it("elimina el registro y audita al administrador", async () => {
  await deleteMaterial("event", "material", "admin");
  expect(mocks.delete).toHaveBeenCalledWith("material");
  expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "material.eliminado" }));
});

it("rechaza archivos no permitidos antes de escribir", async () => {
  await expect(uploadMaterial("event", "Script", new File(["script"], "script.html"), "admin")).rejects.toMatchObject({ code: "INVALID" });
  expect(mocks.create).not.toHaveBeenCalled();
});
