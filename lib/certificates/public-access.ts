import { createHash, createHmac } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

export const CERTIFICATE_ACCESS_COOKIE = "eventos_certificate_access";
export const CERTIFICATE_ACCESS_MAX_AGE_SECONDS = 10 * 60;
export const LOOKUP_WINDOW_MS = 15 * 60 * 1000;
export const LOOKUP_MAX_ATTEMPTS = 5;

const issuer = "eventos-unca";
const audience = "certificados-publicos";

export type LookupLimitState = {
  windowStartedAt: string;
  attempts: number;
  blockedUntil?: string;
};

export type LookupLimitDecision = {
  allowed: boolean;
  state: LookupLimitState;
};

function signingKey(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function deriveLookupLimitKey(input: {
  secret: string;
  origin: string;
  normalizedDocument: string;
}) {
  return createHmac("sha256", input.secret)
    .update(input.origin)
    .update("\0")
    .update(input.normalizedDocument)
    .digest("hex");
}

export function consumeLookupAttempt(
  current: LookupLimitState | null,
  now = new Date(),
): LookupLimitDecision {
  const nowMs = now.getTime();
  const currentStart = current ? new Date(current.windowStartedAt).getTime() : NaN;
  const expired = !Number.isFinite(currentStart) || nowMs - currentStart >= LOOKUP_WINDOW_MS;

  if (!current || expired) {
    return {
      allowed: true,
      state: { windowStartedAt: now.toISOString(), attempts: 1 },
    };
  }

  const blockedUntilMs = current.blockedUntil
    ? new Date(current.blockedUntil).getTime()
    : 0;
  if (blockedUntilMs > nowMs || current.attempts >= LOOKUP_MAX_ATTEMPTS) {
    return { allowed: false, state: current };
  }

  const attempts = current.attempts + 1;
  const blockedUntil =
    attempts >= LOOKUP_MAX_ATTEMPTS
      ? new Date(currentStart + LOOKUP_WINDOW_MS).toISOString()
      : undefined;
  return {
    allowed: true,
    state: {
      windowStartedAt: current.windowStartedAt,
      attempts,
      blockedUntil,
    },
  };
}

export function certificateAccessCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: CERTIFICATE_ACCESS_MAX_AGE_SECONDS,
  };
}

export async function sealCertificateAccess(
  certificateIds: string[],
  secret: string,
  now = new Date(),
  registrationIds: string[] = [],
) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ certificateIds: [...new Set(certificateIds)], registrationIds: [...new Set(registrationIds)] })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + CERTIFICATE_ACCESS_MAX_AGE_SECONDS)
    .sign(signingKey(secret));
}

export async function unsealCertificateAccess(
  value: string,
  secret: string,
  now = new Date(),
): Promise<string[] | null> {
  const access = await unsealParticipantAccess(value, secret, now);
  return access?.certificateIds ?? null;
}

export type ParticipantAccess = { certificateIds: string[]; registrationIds: string[] };

export async function unsealParticipantAccess(
  value: string,
  secret: string,
  now = new Date(),
): Promise<ParticipantAccess | null> {
  try {
    const { payload } = await jwtVerify(value, signingKey(secret), {
      issuer,
      audience,
      currentDate: now,
      clockTolerance: 5,
    });
    if (
      !Array.isArray(payload.certificateIds) ||
      payload.certificateIds.some((id) => typeof id !== "string")
    ) {
      return null;
    }
    const registrationIds = payload.registrationIds ?? [];
    if (!Array.isArray(registrationIds) || registrationIds.some((id) => typeof id !== "string")) return null;
    return { certificateIds: payload.certificateIds, registrationIds };
  } catch {
    return null;
  }
}
