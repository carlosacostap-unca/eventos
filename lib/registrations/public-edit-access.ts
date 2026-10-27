import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getServerEnv } from "@/lib/env";
import { DomainError } from "@/lib/domain/errors";

type EditAccess = { eventId: string; registrationId: string; document: string; revision: string };
const audience = "editar-inscripcion-publica";
const key = () => createHash("sha256").update(getServerEnv().SESSION_SECRET).digest();

export async function signRegistrationEdit(access: EditAccess) {
  return new SignJWT(access).setProtectedHeader({ alg: "HS256" }).setAudience(audience)
    .setIssuer("eventos-unca").setIssuedAt().setExpirationTime("30m").sign(key());
}

export async function verifyRegistrationEdit(token: string, eventId: string, document: string): Promise<EditAccess> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience, issuer: "eventos-unca" });
    if (payload.eventId !== eventId || payload.document !== document || typeof payload.registrationId !== "string" || typeof payload.revision !== "string") throw new Error("scope");
    return { eventId, document, registrationId: payload.registrationId, revision: payload.revision };
  } catch {
    throw new DomainError("INVALID", "Volvé a buscar tu DNI para actualizar la inscripción. La consulta venció o no corresponde a estos datos.");
  }
}
