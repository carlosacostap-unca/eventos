import { expect, it } from "vitest";
import { certificateVerificationCode, parseCertificateCode } from "./verification-code";

it("acepta códigos actuales y anteriores con ambos rótulos impresos", () => {
  expect(parseCertificateCode(" ID CERT-ABC123DEF456789 ")).toEqual({ kind: "certificate", certificateId: "abc123def456789", code: "CERT-abc123def456789" });
  expect(parseCertificateCode("abcdefghijklmno-123456789012345")).toEqual({ kind: "legacy", eventId: "abcdefghijklmno", registrationId: "123456789012345", code: "abcdefghijklmno-123456789012345" });
  expect(parseCertificateCode("Código de validación: CERT-ABC123DEF456789")).toEqual(parseCertificateCode("CERT-abc123def456789"));
  expect(parseCertificateCode("Codigo de validacion: abcdefghijklmno-123456789012345")).toEqual(parseCertificateCode("abcdefghijklmno-123456789012345"));
  expect(certificateVerificationCode("abc123def456789")).not.toBe(certificateVerificationCode("abc123def456780"));
});

it.each([null, new File(["x"], "codigo"), "", "muestra", "CERT-123", "abcdefghijklmno-vista-previa", 'CERT-abc123def456789" || true', "x".repeat(100)])("rechaza entradas que no son códigos emitidos: %s", (value) => {
  expect(parseCertificateCode(value)).toBeNull();
});
