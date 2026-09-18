import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  createCertificatePdf,
  validateCertificateTemplate,
} from "@/lib/certificates/pdf";

describe("certificados PDF", () => {
  it("genera un PDF válido con datos del asistente", async () => {
    const bytes = await createCertificatePdf({
      event: {
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
      },
    });
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
    expect(bytes.byteLength).toBeGreaterThan(500);
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
