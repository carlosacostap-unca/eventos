"use server";

import { headers } from "next/headers";
import { parseCertificateCode } from "@/lib/certificates/verification-code";
import { consumePersistentLookupAttempt } from "@/lib/services/certificate-lookup";
import { verifyCertificateCode, type CertificateVerificationResult } from "@/lib/services/certificate-verification";

export type CertificateVerificationState = {
  message?: string;
  code?: string;
  result?: CertificateVerificationResult;
};

export async function verifyCertificateAction(_state: CertificateVerificationState, formData: FormData): Promise<CertificateVerificationState> {
  const parsed = parseCertificateCode(formData.get("codigo"));
  if (!parsed) return { message: "Revisá el código completo de validación que figura al pie del certificado." };
  try {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip")?.trim() || "origen-desconocido";
    const allowed = await consumePersistentLookupAttempt({ origin, normalizedDocument: "verificacion-publica-certificados", maxAttempts: 20 });
    if (!allowed) return { message: "Alcanzaste el límite de consultas. Volvé a intentar en unos minutos." };
    const result = await verifyCertificateCode(parsed.code);
    return { code: parsed.code, result };
  } catch {
    return { message: "No pudimos consultar el registro. Volvé a intentar en unos minutos." };
  }
}
