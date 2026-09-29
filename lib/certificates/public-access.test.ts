import { describe, expect, it } from "vitest";

import {
  consumeLookupAttempt,
  deriveLookupLimitKey,
  sealCertificateAccess,
  unsealCertificateAccess,
  unsealParticipantAccess,
} from "@/lib/certificates/public-access";

describe("acceso público a certificados", () => {
  it("autoriza inscripciones sin certificado, vence y rechaza firmas adulteradas", async () => {
    const secret = "s".repeat(32);
    const now = new Date("2026-09-29T12:00:00Z");
    const token = await sealCertificateAccess([], secret, now, ["reg1", "reg1"]);
    expect(await unsealParticipantAccess(token, secret, now)).toEqual({ certificateIds: [], registrationIds: ["reg1"] });
    expect(await unsealParticipantAccess(token, "x".repeat(32), now)).toBeNull();
    expect(await unsealParticipantAccess(token, secret, new Date(now.getTime() + 11 * 60 * 1000))).toBeNull();
  });
  it("deriva una clave opaca sin conservar documento ni origen", () => {
    const key = deriveLookupLimitKey({
      secret: "s".repeat(32),
      origin: "203.0.113.10",
      normalizedDocument: "12345678",
    });
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("12345678");
    expect(key).not.toContain("203.0.113.10");
  });

  it("admite cinco intentos, bloquea el sexto y reinicia al vencer la ventana", () => {
    const start = new Date("2026-09-26T12:00:00.000Z");
    let state = consumeLookupAttempt(null, start).state;
    for (let attempt = 2; attempt <= 5; attempt += 1) {
      const decision = consumeLookupAttempt(state, new Date(start.getTime() + attempt));
      expect(decision.allowed).toBe(true);
      state = decision.state;
    }
    expect(consumeLookupAttempt(state, new Date(start.getTime() + 10)).allowed).toBe(false);
    const restored = JSON.parse(JSON.stringify(state));
    expect(
      consumeLookupAttempt(restored, new Date(start.getTime() + 15 * 60 * 1000)).allowed,
    ).toBe(true);
  });

  it("firma solo los certificados autorizados y vence la autorización", async () => {
    const secret = "s".repeat(32);
    const now = new Date("2026-09-26T12:00:00.000Z");
    const token = await sealCertificateAccess(["cert-1", "cert-2"], secret, now);
    await expect(unsealCertificateAccess(token, secret, now)).resolves.toEqual([
      "cert-1",
      "cert-2",
    ]);
    await expect(
      unsealCertificateAccess(token, secret, new Date(now.getTime() + 11 * 60 * 1000)),
    ).resolves.toBeNull();
  });
});
