import { describe, expect, it } from "vitest";

import { parseServerEnv } from "@/lib/env-schema";

const valid = {
  POCKETBASE_URL: "https://pocketbase.example.com",
  POCKETBASE_ADMIN_EMAIL: "admin@example.com",
  POCKETBASE_ADMIN_PASSWORD: "clave-segura",
  SESSION_SECRET: "s".repeat(32),
  INTERNAL_JOBS_SECRET: "j".repeat(32),
};

describe("configuración del servidor", () => {
  it("acepta URL y credenciales administrativas válidas", () => {
    const parsed = parseServerEnv(valid);
    expect(parsed.POCKETBASE_URL).toBe(valid.POCKETBASE_URL);
    expect(parsed.POCKETBASE_ADMIN_EMAIL).toBe(valid.POCKETBASE_ADMIN_EMAIL);
  });

  it("falla sin secretos y no imprime sus valores", () => {
    expect(() =>
      parseServerEnv({ ...valid, SESSION_SECRET: "corto" }),
    ).toThrow("SESSION_SECRET");
  });

  it("exige el email y la contraseña del administrador de PocketBase", () => {
    expect(() =>
      parseServerEnv({ ...valid, POCKETBASE_ADMIN_EMAIL: "" }),
    ).toThrow("POCKETBASE_ADMIN_EMAIL");
    expect(() =>
      parseServerEnv({ ...valid, POCKETBASE_ADMIN_PASSWORD: "" }),
    ).toThrow("POCKETBASE_ADMIN_PASSWORD");
  });
});
