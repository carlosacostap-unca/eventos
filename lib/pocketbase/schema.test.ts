import { describe, expect, it } from "vitest";

import { pocketBaseSchema } from "@/lib/pocketbase/schema";

describe("esquema PocketBase", () => {
  it("declara colecciones e índices únicos críticos", () => {
    expect(pocketBaseSchema.map((collection) => collection.name)).toEqual([
      "administradores",
      "cuentas_servicio",
      "tipos_evento",
      "eventos",
      "disertantes",
      "inscripciones",
      "auditoria",
      "certificados",
      "envios_certificados",
    ]);
    const events = pocketBaseSchema.find((collection) => collection.name === "eventos");
    expect(events?.fields.some((field) => field.name === "tipo_evento")).toBe(true);
    expect(events?.fields.some((field) => field.name === "costo")).toBe(true);
    expect(events?.fields.some((field) => field.name === "certificado_asistencia")).toBe(true);
    const speakers = pocketBaseSchema.find((collection) => collection.name === "disertantes");
    expect(speakers?.fields.some((field) => field.name === "foto")).toBe(true);
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
