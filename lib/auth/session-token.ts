import { createHash } from "node:crypto";

import { EncryptJWT, jwtDecrypt } from "jose";

export const ADMIN_SESSION_COOKIE = "eventos_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type AdminSession = {
  adminId: string;
  email: string;
  name: string;
};

function secretKey(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function adminCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

export async function sealAdminSession(
  session: AdminSession,
  secret: string,
): Promise<string> {
  return new EncryptJWT({
    email: session.email,
    name: session.name,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setSubject(session.adminId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .encrypt(secretKey(secret));
}

export async function unsealAdminSession(
  value: string,
  secret: string,
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtDecrypt(value, secretKey(secret), {
      clockTolerance: 5,
    });
    if (
      !payload.sub ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }
    return {
      adminId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}
