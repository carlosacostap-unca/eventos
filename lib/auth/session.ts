import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isStaffRole, type StaffRole } from "@/lib/domain/access";

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

export type StaffSession = AdminSession & { role: StaffRole };

export async function getAuthenticatedStaff(): Promise<StaffSession | null> {
  const session = await getSession();
  if (!session) return null;

  try {
    const client = await createServicePocketBase();
    const administrator = await client
      .collection("administradores")
      .getOne(session.adminId, { fields: "id,role" });
    return administrator.id === session.adminId && isStaffRole(administrator.role)
      ? { ...session, role: administrator.role }
      : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedAdmin(): Promise<StaffSession | null> {
  const staff = await getAuthenticatedStaff();
  return staff?.role === "admin" ? staff : null;
}

export async function requireStaff(): Promise<StaffSession> {
  const staff = await getAuthenticatedStaff();
  if (!staff) redirect("/iniciar-sesion");
  return staff;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await requireStaff();
  if (session.role !== "admin") notFound();
  return session;
}
