import { PDFDocument, PDFPage } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

import {
  createCertificatePdf,
  validateCertificateTemplate,
} from "@/lib/certificates/pdf";

describe("certificados PDF", () => {
  it("genera un PDF válido con datos del asistente", async () => {
    const drawn = vi.spyOn(PDFPage.prototype, "drawText");
    try {
    const bytes = await createCertificatePdf({
      eventTypeName: "Taller Teórico-Práctico",
      event: {
        textos_certificado: {
          signatureLeftName: "Autoridad de prueba",
          signatureLeftRole: "Coordinación de {evento}",
          signatureLeftInstitution: "",
          signatureRightName: "Otra autoridad",
          signatureRightRole: "Dirección",
          signatureRightInstitution: "Institución de prueba",
        },
        id: "evento1",
        titulo: "Jornada de extensión",
        descripcion: "Evento",
        slug: "jornada",
        inicio: "2027-04-02T10:00:00.000Z",
        fin: "2027-04-02T12:00:00.000Z",
        lugar: "Aula Magna",
        cupo: 100,
        inscripcion_habilitada: false,
        estado: "finalizado",
        created: "",
        updated: "",
      },
      registration: {
        id: "registro1",
        nombres: "Ana",
        apellidos: "Pérez",
        documento: "35.500.599",
      },
    });
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
    expect(document.getPage(0).getSize()).toEqual({ width: 842, height: 595 });
    expect(bytes.byteLength).toBeGreaterThan(100_000);
    const texts = drawn.mock.calls.map(([text]) => text);
    expect(texts).toEqual(expect.arrayContaining([
      "ha participado de la actividad de tipo Taller Teórico-Práctico de 2 horas:",
      "Autoridad de prueba", "Coordinación de Jornada de extensión",
      "Otra autoridad", "Dirección", "Institución de prueba",
    ]));
    expect(texts).not.toContain("Ms. Ing. Marcos Darío ARANDA");
    expect(texts).not.toContain("");
    } finally {
      drawn.mockRestore();
    }
  });

  it("ajusta nombres y títulos extensos sin impedir la generación", async () => {
    const bytes = await createCertificatePdf({
      event: {
        id: "evento-extenso",
        titulo:
          "Seminario de actualización profesional en innovación tecnológica, comunicación institucional y desarrollo sostenible",
        descripcion: "Evento",
        slug: "seminario-extenso",
        inicio: "2027-04-02T10:00:00.000Z",
        fin: "2027-04-02T12:00:00.000Z",
        lugar: "San Fernando del Valle de Catamarca",
        cupo: 100,
        inscripcion_habilitada: false,
        estado: "finalizado",
        created: "",
        updated: "",
      },
      registration: {
        id: "registro-extenso",
        nombres: "María de los Ángeles",
        apellidos: "Fernández de la Fuente",
        documento: "40.123.456",
      },
    });

    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
    expect(bytes.byteLength).toBeGreaterThan(100_000);
  });

  it("acepta una plantilla PDF con dimensiones suficientes", async () => {
    const document = await PDFDocument.create();
    document.addPage([842, 595]);
    const bytes = await document.save();
    await expect(
      validateCertificateTemplate(
        new File([Buffer.from(bytes)], "plantilla.pdf", {
          type: "application/pdf",
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("rechaza formatos y dimensiones inválidas", async () => {
    await expect(
      validateCertificateTemplate(
        new File(["contenido"], "plantilla.txt", { type: "text/plain" }),
      ),
    ).rejects.toThrow("PDF, PNG o JPG");

    const document = await PDFDocument.create();
    document.addPage([200, 120]);
    const bytes = await document.save();
    await expect(
      validateCertificateTemplate(
        new File([Buffer.from(bytes)], "pequena.pdf", {
          type: "application/pdf",
        }),
      ),
    ).rejects.toThrow("demasiado pequeña");
  });
});
