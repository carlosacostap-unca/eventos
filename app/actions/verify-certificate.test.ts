import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), limit: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": "127.0.0.1" }) }));
vi.mock("@/lib/services/certificate-lookup", () => ({ consumePersistentLookupAttempt: mocks.limit }));
vi.mock("@/lib/services/certificate-verification", () => ({ verifyCertificateCode: mocks.verify }));
import { verifyCertificateAction } from "./verify-certificate";
const form = (code: string) => { const data = new FormData(); data.set("codigo", code); return data; };
beforeEach(() => { vi.resetAllMocks(); mocks.limit.mockResolvedValue(true); mocks.verify.mockResolvedValue({ legacy: false, certificates: [], unavailableCount: 0 }); });

it("limita consultas por origen aunque se cambie el código y devuelve solo el resultado público", async () => {
  const state = await verifyCertificateAction({}, form("ID CERT-abc123def456789"));
  expect(state.code).toBe("CERT-abc123def456789");
  expect(state.result).toBeDefined();
  expect(mocks.limit).toHaveBeenCalledWith({ origin: "127.0.0.1", normalizedDocument: "verificacion-publica-certificados", maxAttempts: 20 });
  expect(mocks.verify).toHaveBeenCalledWith(state.code);
});
it("no consulta la base por códigos de muestra o incompletos", async () => {
  expect((await verifyCertificateAction({}, form("muestra"))).message).toContain("código completo");
  expect(mocks.verify).not.toHaveBeenCalled();
  expect(mocks.limit).not.toHaveBeenCalled();
});
it("descarta resultados anteriores cuando se agotan los intentos o falla el servicio", async () => {
  mocks.limit.mockResolvedValue(false);
  expect(await verifyCertificateAction({ code: "anterior" }, form("CERT-abc123def456789"))).toEqual({ message: expect.stringContaining("límite") });
  expect(mocks.verify).not.toHaveBeenCalled();
  mocks.limit.mockResolvedValue(true);
  mocks.verify.mockRejectedValue(new Error("credencial privada"));
  const state = await verifyCertificateAction({}, form("CERT-abc123def456789"));
  expect(state.result).toBeUndefined();
  expect(state.message).not.toContain("credencial");
});
