import { describe, expect, it } from "vitest";

import {
  eventInputSchema,
  normalizeDocument,
  registrationInputSchema,
} from "@/lib/domain/models";

describe("modelos de dominio", () => {
  it("normaliza documentos con espacios y separadores", () => {
    expect(normalizeDocument(" 27.123.456-8 ")).toBe("271234568");
  });

  it("acepta un evento válido y rechaza un rango de fechas invertido", () => {
    const base = {
      titulo: "Jornada universitaria",
      tipoEvento: "evtypeexample01",
      descripcion: "Una descripción suficientemente extensa",
      slug: "jornada-universitaria",
      inicio: "2027-05-20T10:00:00.000Z",
      fin: "2027-05-20T12:00:00.000Z",
      lugar: "Aula Magna",
      cupo: 100,
      inscripcionHabilitada: true,
      estado: "publicado",
    };
    expect(eventInputSchema.safeParse(base).success).toBe(true);
    expect(
      eventInputSchema.safeParse({ ...base, fin: "2027-05-20T09:00:00.000Z" }).success,
    ).toBe(false);
  });

  it("valida los datos obligatorios de inscripción", () => {
    expect(
      registrationInputSchema.safeParse({
        nombres: "Ana",
        apellidos: "Pérez",
        email: "ana@example.com",
        documento: "27.123.456",
      }).success,
    ).toBe(true);
    expect(
      registrationInputSchema.safeParse({
        nombres: "",
        apellidos: "Pérez",
        email: "incorrecto",
        documento: "1",
      }).success,
    ).toBe(false);
  });
});
