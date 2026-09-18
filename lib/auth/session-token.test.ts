import { describe, expect, it } from "vitest";

import {
  adminCookieOptions,
  sealAdminSession,
  unsealAdminSession,
  type AdminSession,
} from "@/lib/auth/session-token";

const session: AdminSession = {
  adminId: "admin-1",
  email: "admin@example.com",
  name: "Administración",
};

describe("sesión administrativa", () => {
  it("cifra y recupera la sesión sin almacenar tokens de PocketBase", async () => {
    const secret = "a".repeat(32);
    const token = await sealAdminSession(session, secret);
    expect(token).not.toContain(session.email);
    expect(await unsealAdminSession(token, secret)).toEqual(session);
  });

  it("rechaza una sesión cifrada con otro secreto", async () => {
    const token = await sealAdminSession(session, "a".repeat(32));
    expect(await unsealAdminSession(token, "b".repeat(32))).toBeNull();
  });

  it("configura una cookie protegida", () => {
    expect(adminCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });
});
