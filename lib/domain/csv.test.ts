import { describe, expect, it } from "vitest";

import { escapeCsv, registrationsToCsv } from "@/lib/domain/csv";

describe("CSV", () => {
  it("escapa comillas, comas y saltos de línea", () => {
    expect(escapeCsv('Pérez, "Ana"\n')).toBe('"Pérez, ""Ana""\n"');
  });

  it("incluye BOM y datos de inscripción", () => {
    const csv = registrationsToCsv([
      {
        id: "1",
        evento: "e1",
        nombres: "Ana",
        apellidos: "Pérez",
        email: "ana@example.com",
        documento: "123",
        documento_normalizado: "123",
        origen: "publica",
        numero_cupo_publico: 1,
        acreditado: true,
        acreditado_en: "2027-01-01",
        created: "2026-12-01",
        updated: "2026-12-01",
      },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Ana,Pérez,ana@example.com");
  });
});
