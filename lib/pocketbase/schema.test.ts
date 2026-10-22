import { describe, expect, it } from "vitest";

import { pocketBaseSchema } from "@/lib/pocketbase/schema";

describe("esquema PocketBase", () => {
  it("declara colecciones e índices únicos críticos", () => {
    expect(pocketBaseSchema.map((collection) => collection.name)).toEqual([
      "materiales_evento",
      "administradores",
      "cuentas_servicio",
      "asignaciones_evento",
      "tipos_evento",
      "eventos",
      "disertantes",
      "participaciones_disertantes",
      "inscripciones",
      "auditoria",
      "certificados",
      "envios_certificados",
      "limites_consulta_certificados",
      "modalidades_inscripcion", "versiones_modalidad", "exposiciones", "integrantes_exposicion", "operaciones_inscripcion", "destinatarios_certificado", "bloqueos_operacion",
    ]);
    const events = pocketBaseSchema.find((collection) => collection.name === "eventos");
    expect(events?.fields.some((field) => field.name === "tipo_evento")).toBe(true);
    expect(events?.fields.some((field) => field.name === "costo")).toBe(true);
    expect(events?.fields.some((field) => field.name === "certificado_asistencia")).toBe(true);
    expect(events?.fields.some((field) => field.name === "textos_certificado")).toBe(true);
    const speakers = pocketBaseSchema.find((collection) => collection.name === "disertantes");
    expect(speakers?.fields.some((field) => field.name === "foto")).toBe(true);
    const origin = speakers?.fields.find((field) => field.name === "evento");
    expect(origin).toMatchObject({ cascadeDelete: false });
    const links = pocketBaseSchema.find(
      (collection) => collection.name === "participaciones_disertantes",
    );
    expect(links?.indexes?.join(" ")).toContain(
      "idx_participaciones_evento_disertante",
    );
    const registrations = pocketBaseSchema.find(
      (collection) => collection.name === "inscripciones",
    );
    expect(registrations?.indexes?.join(" ")).toContain(
      "idx_inscripciones_documento",
    );
    expect(registrations?.indexes?.join(" ")).toContain(
      "idx_inscripciones_documento_global",
    );
    expect(registrations?.indexes?.join(" ")).toContain("idx_inscripciones_cupo");

    const administrators = pocketBaseSchema.find(
      (collection) => collection.name === "administradores",
    );
    expect(administrators?.viewRule).toContain(
      '@request.auth.role = "service"',
    );

    const lookupLimits = pocketBaseSchema.find(
      (collection) => collection.name === "limites_consulta_certificados",
    );
    expect(lookupLimits?.listRule).toContain('@request.auth.role = "service"');
    expect(lookupLimits?.indexes?.join(" ")).toContain("idx_limites_consulta_clave");
  });

  it("protege los materiales tanto en los registros como en el storage", () => {
    const materials = pocketBaseSchema.find((collection) => collection.name === "materiales_evento");
    expect(materials?.viewRule).toContain('@request.auth.role = "service"');
    expect(materials?.listRule).toBe(materials?.viewRule);
    expect(materials?.fields.find((field) => field.name === "archivo")).toMatchObject({ protected: true, required: true, maxSize: 25 * 1024 * 1024 });
    expect(materials?.fields.find((field) => field.name === "evento")).toMatchObject({ required: true, cascadeDelete: true });
  });

  it("separa identidad operativa de permisos por evento y protege la elevación", () => {
    const users = pocketBaseSchema.find(c => c.name === "administradores")!;
    expect(users.fields.find(f => f.name === "role")?.values).toEqual(["admin", "personal"]);
    expect(users.updateRule).toContain('@request.body.role:changed = false');
    const assignments = pocketBaseSchema.find(c => c.name === "asignaciones_evento")!;
    expect(assignments.indexes?.join(" ")).toContain("(usuario, evento)");
    for (const rule of [assignments.listRule, assignments.viewRule, assignments.createRule, assignments.updateRule, assignments.deleteRule]) expect(rule).toBe('@request.auth.role = "service"');
    expect(assignments.fields.find(f => f.name === "usuario")?.collectionId).toBe(users.id);
  });
});
