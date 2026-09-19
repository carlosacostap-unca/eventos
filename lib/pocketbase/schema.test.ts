import { describe, expect, it } from "vitest";

import { pocketBaseSchema } from "@/lib/pocketbase/schema";

describe("esquema PocketBase", () => {
  it("declara colecciones e índices únicos críticos", () => {
    expect(pocketBaseSchema.map((collection) => collection.name)).toEqual([
      "administradores",
      "cuentas_servicio",
      "eventos",
      "inscripciones",
      "auditoria",
      "certificados",
      "envios_certificados",
    ]);
    const registrations = pocketBaseSchema.find(
      (collection) => collection.name === "inscripciones",
    );
    expect(registrations?.indexes?.join(" ")).toContain(
      "idx_inscripciones_documento",
    );
    expect(registrations?.indexes?.join(" ")).toContain("idx_inscripciones_cupo");

    const administrators = pocketBaseSchema.find(
      (collection) => collection.name === "administradores",
    );
    expect(administrators?.viewRule).toContain(
      '@request.auth.role = "service"',
    );
  });
});
