import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { CERTIFICATE_ACCESS_COOKIE, sealCertificateAccess } from "@/lib/certificates/public-access";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ SESSION_SECRET: "s".repeat(32) }) }));
vi.mock("@/lib/services/materials", () => ({ getMaterialDownload: mocks.download }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: vi.fn() }));
import { GET } from "./route";

const params = Promise.resolve({ id: "material" });
function request(token?: string) {
  return new NextRequest("http://localhost/api/materiales/material", { headers: token ? { Cookie: `${CERTIFICATE_ACCESS_COOKIE}=${token}` } : {} });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.download.mockResolvedValue({ body: new Response("archivo").body, filename: "Guía de la charla.pdf" });
});
it("rechaza una descarga directa sin cookie", async () => {
  expect((await GET(request(), { params })).status).toBe(404);
  expect(mocks.download).not.toHaveBeenCalled();
});
it("rechaza una cookie vencida o inválida", async () => {
  const expired = await sealCertificateAccess([], "s".repeat(32), new Date(Date.now() - 11 * 60 * 1000), ["reg1"]);
  for (const token of [expired, "invalid"]) expect((await GET(request(token), { params })).status).toBe(404);
  expect(mocks.download).not.toHaveBeenCalled();
});
it("entrega un adjunto sin cachear y preserva acentos del nombre", async () => {
  const token = await sealCertificateAccess([], "s".repeat(32), new Date(), ["reg1"]);
  const response = await GET(request(token), { params });
  expect(mocks.download).toHaveBeenCalledWith("material", { registrationIds: ["reg1"] });
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Content-Disposition")).toContain("Gu%C3%ADa%20de%20la%20charla.pdf");
  expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
  expect(await response.text()).toBe("archivo");
});
it("no expone errores internos cuando se revoca el acceso", async () => {
  const token = await sealCertificateAccess([], "s".repeat(32), new Date(), ["reg1"]);
  mocks.download.mockRejectedValue(new Error("storage-private-token"));
  const response = await GET(request(token), { params });
  expect(response.status).toBe(404);
  expect(await response.text()).not.toContain("storage-private-token");
});
