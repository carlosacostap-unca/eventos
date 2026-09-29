import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  find: vi.fn(), limit: vi.fn(), set: vi.fn(), delete: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error("REDIRECT:" + path); },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.set, delete: mocks.delete }),
  headers: async () => new Headers({ "x-real-ip": "127.0.0.1" }),
}));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ SESSION_SECRET: "s".repeat(32) }) }));
vi.mock("@/lib/services/certificate-lookup", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/services/certificate-lookup")>(),
  consumePersistentLookupAttempt: mocks.limit,
}));
vi.mock("@/lib/services/participant-resources", () => ({ findAccreditedRegistrations: mocks.find }));

import { lookupCertificatesAction } from "./public-certificates";
import { CERTIFICATE_ACCESS_COOKIE, unsealParticipantAccess } from "@/lib/certificates/public-access";

describe("consulta de certificados solo con documento", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.limit.mockResolvedValue(true);
    mocks.find.mockResolvedValue(["registration1"]);
  });

  function form(document = "12.345.678") {
    const data = new FormData();
    data.set("documento", document);
    return data;
  }

  it("acepta el DNI y autoriza inscripciones acreditadas aunque no haya certificados", async () => {
    await expect(lookupCertificatesAction({}, form())).rejects.toThrow("REDIRECT:/mis-certificados/resultados");
    expect(mocks.find).toHaveBeenCalledWith("12345678");
    expect(mocks.limit).toHaveBeenCalledWith({ origin: "127.0.0.1", normalizedDocument: "12345678" });
    const [name, token] = mocks.set.mock.calls[0];
    expect(name).toBe(CERTIFICATE_ACCESS_COOKIE);
    expect(await unsealParticipantAccess(token, "s".repeat(32))).toEqual({ certificateIds: [], registrationIds: ["registration1"] });
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("rechaza un documento demasiado corto", async () => {
    expect((await lookupCertificatesAction({}, form("12"))).fields?.documento).toBeDefined();
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("mantiene el límite de intentos y revoca el acceso anterior", async () => {
    mocks.limit.mockResolvedValue(false);
    expect((await lookupCertificatesAction({}, form())).ok).toBeUndefined();
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.delete).toHaveBeenCalledWith(CERTIFICATE_ACCESS_COOKIE);
  });

  it("no autoriza descargas cuando el documento no tiene inscripciones acreditadas", async () => {
    mocks.find.mockResolvedValue([]);
    expect((await lookupCertificatesAction({}, form())).message).toContain("ese documento");
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.delete).toHaveBeenCalledWith(CERTIFICATE_ACCESS_COOKIE);
  });
});
