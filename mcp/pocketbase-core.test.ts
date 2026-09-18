import { describe, expect, it } from "vitest";

import {
  assertSafeWriteData,
  assertWritableCollection,
  redactSensitive,
} from "./pocketbase-core";

describe("protecciones del MCP de PocketBase", () => {
  it("elimina secretos incluso cuando están anidados", () => {
    expect(
      redactSensitive({
        id: "registro",
        token: "no-debe-salir",
        nested: {
          password: "no-debe-salir",
          nombre: "visible",
        },
      }),
    ).toEqual({
      id: "registro",
      nested: {
        nombre: "visible",
      },
    });
  });

  it("rechaza campos de credenciales en escrituras", () => {
    expect(() =>
      assertSafeWriteData({ nombre: "Evento", password: "no-permitida" }),
    ).toThrow("campos protegidos");
  });

  it("impide escribir en colecciones de identidad y auditoría", () => {
    expect(() => assertWritableCollection("administradores")).toThrow(
      "no está habilitada",
    );
    expect(() => assertWritableCollection("auditoria")).toThrow(
      "no está habilitada",
    );
  });
});
