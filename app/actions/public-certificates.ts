"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  CERTIFICATE_ACCESS_COOKIE,
  certificateAccessCookieOptions,
  sealCertificateAccess,
} from "@/lib/certificates/public-access";
import { getServerEnv } from "@/lib/env";
import {
  consumePersistentLookupAttempt,
  findPublicCertificates,
  normalizeCertificateLookup,
} from "@/lib/services/certificate-lookup";

const lookupSchema = z.object({
  documento: z
    .string()
    .trim()
    .min(5, "Ingresá un documento válido")
    .max(32, "Ingresá un documento válido"),
});

export type CertificateLookupState = {
  ok?: boolean;
  message?: string;
  fields?: { documento?: string[] };
};

const genericMessage =
  "No encontramos certificados con ese documento. Revisalo o consultá con la Facultad.";
const limitedMessage =
  "No pudimos completar la consulta. Esperá unos minutos antes de volver a intentar.";

function requestOrigin(requestHeaders: Headers) {
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    "origen-desconocido"
  );
}

export async function lookupCertificatesAction(
  _state: CertificateLookupState,
  formData: FormData,
): Promise<CertificateLookupState> {
  const parsed = lookupSchema.safeParse({
    documento: formData.get("documento"),
  });
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };

  const normalized = normalizeCertificateLookup({
    document: parsed.data.documento,
  });
  const cookieStore = await cookies();

  try {
    const allowed = await consumePersistentLookupAttempt({
      origin: requestOrigin(await headers()),
      normalizedDocument: normalized.normalizedDocument,
    });
    if (!allowed) {
      cookieStore.delete(CERTIFICATE_ACCESS_COOKIE);
      return { message: limitedMessage };
    }

    const certificates = await findPublicCertificates(normalized);
    if (certificates.length === 0) {
      cookieStore.delete(CERTIFICATE_ACCESS_COOKIE);
      return { message: genericMessage };
    }

    const env = getServerEnv();
    cookieStore.set(
      CERTIFICATE_ACCESS_COOKIE,
      await sealCertificateAccess(
        certificates.map((certificate) => certificate.id),
        env.SESSION_SECRET,
      ),
      certificateAccessCookieOptions(process.env.NODE_ENV === "production"),
    );
  } catch {
    cookieStore.delete(CERTIFICATE_ACCESS_COOKIE);
    return { message: genericMessage };
  }
  redirect("/mis-certificados/resultados");
}
