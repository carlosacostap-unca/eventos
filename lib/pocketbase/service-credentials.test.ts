import { describe, expect, it } from "vitest";

import { deriveServiceCredentials } from "@/lib/pocketbase/service-credentials";

describe("credenciales técnicas derivadas", () => {
  it("son estables, distintas del administrador y sensibles a la contraseña", () => {
    const input = {
      url: "https://pocketbase.example.com",
      adminEmail: "admin@example.com",
      adminPassword: "clave-administrativa",
    };
    const first = deriveServiceCredentials(input);
    expect(deriveServiceCredentials(input)).toEqual(first);
    expect(first.email).not.toBe(input.adminEmail);
    expect(first.password).not.toContain(input.adminPassword);
    expect(first.password.length).toBeGreaterThanOrEqual(32);
    expect(
      deriveServiceCredentials({ ...input, adminPassword: "otra-clave" }).password,
    ).not.toBe(first.password);
  });
});
