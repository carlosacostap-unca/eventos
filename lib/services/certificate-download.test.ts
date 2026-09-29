import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ certificate: vi.fn(), registration: vi.fn(), fetch: vi.fn(), fileURL: vi.fn() }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => ({
  collection: (name: string) => ({ getOne: name === "certificados" ? mocks.certificate : mocks.registration }),
  files: { getURL: mocks.fileURL }, authStore: { token: "service" },
}) }));
vi.mock("@/lib/services/events", () => ({}));
vi.mock("@/lib/services/event-types", () => ({}));
vi.mock("@/lib/services/registrations", () => ({}));
vi.mock("@/lib/services/audit", () => ({}));
vi.mock("@/lib/certificates/pdf", () => ({}));
import { getCertificateDownload } from "./certificates";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.certificate.mockResolvedValue({ id: "cert1", evento: "event", inscripcion: "reg1", archivo: "certificate.pdf" });
  mocks.registration.mockResolvedValue({ id: "reg1", evento: "event", acreditado: true, documento_normalizado: "12345678" });
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockResolvedValue(new Response("PDF"));
  mocks.fileURL.mockReturnValue("https://storage.example/certificate.pdf");
});
afterEach(() => vi.unstubAllGlobals());

it.each([
  { certificateIds: [], registrationIds: ["reg1"] },
  { certificateIds: ["cert1"], registrationIds: [] },
])("permite descargar con autorización nueva o anterior: %j", async (access) => {
  const download = await getCertificateDownload("cert1", access);
  expect(new TextDecoder().decode(download.bytes)).toBe("PDF");
  expect(download.filename).toBe("certificado-12345678.pdf");
});
it.each([
  { id: "reg1", evento: "event", acreditado: false },
  { id: "reg1", evento: "other", acreditado: true },
  { id: "other", evento: "event", acreditado: true },
])("no descarga certificados fuera de la acreditación autorizada: %j", async (registration) => {
  mocks.registration.mockResolvedValue(registration);
  await expect(getCertificateDownload("cert1", { certificateIds: [], registrationIds: ["reg1"] })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(mocks.fileURL).not.toHaveBeenCalled();
});
