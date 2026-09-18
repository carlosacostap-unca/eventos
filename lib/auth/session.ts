import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  sealAdminSession,
  unsealAdminSession,
  type AdminSession,
} from "@/lib/auth/session-token";
import { getServerEnv } from "@/lib/env";
import { createServicePocketBase } from "@/lib/pocketbase/client";

export type { AdminSession } from "@/lib/auth/session-token";

export async function sealSession(session: AdminSession): Promise<string> {
  return sealAdminSession(session, getServerEnv().SESSION_SECRET);
}

export async function unsealSession(value: string): Promise<AdminSession | null> {
  return unsealAdminSession(value, getServerEnv().SESSION_SECRET);
}

export async function setSession(session: AdminSession) {
  const store = await cookies();
  store.set(
    ADMIN_SESSION_COOKIE,
    await sealSession(session),
    adminCookieOptions(process.env.NODE_ENV === "production"),
  );
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}

export async function getSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const value = store.get(ADMIN_SESSION_COOKIE)?.value;
  return value ? unsealSession(value) : null;
}

export async function getAuthenticatedAdmin(): Promise<AdminSession | null> {
  const session = await getSession();
  if (!session) return null;

  try {
    const client = await createServicePocketBase();
    const administrator = await client
      .collection("administradores")
      .getOne(session.adminId, { fields: "id,email" });
    return String(administrator.email).toLowerCase() === session.email.toLowerCase()
      ? session
      : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAuthenticatedAdmin();
  if (!session) redirect("/iniciar-sesion");
  return session;
}
