import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), download: vi.fn() }));
vi.mock("@/lib/auth/event-access", () => ({ getResourceAccess: mocks.access }));
vi.mock("@/lib/services/presentations", () => ({ getPresentationDownload: mocks.download }));
import { GET } from "./route";
const request = (query = "") => GET(new Request("https://example.com/api/admin/exposiciones/work/presentacion" + query), { params: Promise.resolve({ id: "work" }) });
beforeEach(() => {
  vi.resetAllMocks(); mocks.access.mockResolvedValue({ eventId: "real-event" });
  mocks.download.mockImplementation(async () => ({ filename: "presentación.pdf", format: "pdf", body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("%PDF-1.7")); controller.close(); } }) }));
});
it("no consulta archivos ni storage si falta permiso administrativo", async () => {
  mocks.access.mockResolvedValue(null);
  expect((await request()).status).toBe(401); expect(mocks.download).not.toHaveBeenCalled();
  expect(mocks.access).toHaveBeenCalledWith("exposiciones", "work");
});
it("descarga con nombre seguro y sin caché usando el evento autorizado", async () => {
  const response = await request();
  expect(mocks.download).toHaveBeenCalledWith("work", "real-event");
  expect(response.headers.get("Content-Disposition")).toContain("attachment");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
});
it("permite vista previa inline exclusivamente para PDF", async () => {
  const response = await request("?ver=1");
  expect(response.headers.get("Content-Type")).toBe("application/pdf");
  expect(response.headers.get("Content-Disposition")).toBe("inline");
  mocks.download.mockResolvedValue({ filename: "trabajo.pptx", format: "pptx", body: null });
  expect((await request("?ver=1")).headers.get("Content-Disposition")).toContain("attachment");
});
it("devuelve no disponible ante fallas del storage", async () => {
  mocks.download.mockRejectedValue(new Error("offline"));
  expect((await request()).status).toBe(404);
});
