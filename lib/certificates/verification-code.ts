export function certificateVerificationCode(certificateId: string) {
  return "CERT-" + certificateId;
}

export type CertificateCode =
  | { kind: "certificate"; certificateId: string; code: string }
  | { kind: "legacy"; eventId: string; registrationId: string; code: string };

export function parseCertificateCode(value: unknown): CertificateCode | null {
  if (typeof value !== "string" || value.length > 80) return null;
  const code = value.trim().replace(/^ID\s+/i, "").toLowerCase();
  const current = /^cert-([a-z0-9]{15})$/.exec(code);
  if (current) return { kind: "certificate", certificateId: current[1], code: certificateVerificationCode(current[1]) };
  const legacy = /^([a-z0-9]{15})-([a-z0-9]{15})$/.exec(code);
  return legacy ? { kind: "legacy", eventId: legacy[1], registrationId: legacy[2], code } : null;
}
