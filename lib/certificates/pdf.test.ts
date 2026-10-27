import { PDFDict, PDFDocument, PDFName, PDFPage, PDFRawStream } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import certificateDraft from "@/assets/certificates/eventos/por-que-falla-la-tecnologia.json";
import { resolveCertificateTexts } from "@/lib/domain/certificate-texts";

import {
  createCertificatePdf,
  validateCertificateTemplate,
} from "@/lib/certificates/pdf";

describe("certificados PDF", () => {
  it("compone las tres autoridades del evento sin imágenes ajenas y dentro de sus columnas", async () => {
    const drawn = vi.spyOn(PDFPage.prototype, "drawText");
    const images = vi.spyOn(PDFDocument.prototype, "embedPng");
    const jpegImages = vi.spyOn(PDFDocument.prototype, "embedJpg");
    try {
      const texts = resolveCertificateTexts(certificateDraft.textos_certificado);
      const bytes = await createCertificatePdf({ event: { ...certificateDraft.event, descripcion: "Muestra", cupo: 120, inscripcion_habilitada: true, estado: "publicado", created: "", updated: "", textos_certificado: texts }, eventTypeName: "Charla", registration: { id: "muestra", nombres: "Nombre", apellidos: "Apellido", documento: "00.000.000" } });
      const rendered = await PDFDocument.load(bytes);
      expect(rendered.getPageCount()).toBe(1);
      const states = rendered.getPage(0).node.Resources()!.lookupMaybe(PDFName.of("ExtGState"), PDFDict);
      expect(states?.values().some((reference) => rendered.context.lookup(reference, PDFDict).has(PDFName.of("SMask"))) ?? false).toBe(false);
      const blackImages = rendered.context.enumerateIndirectObjects().map(([, object]) => object).filter((object): object is PDFRawStream => object instanceof PDFRawStream && object.dict.get(PDFName.of("Decode"))?.toString() === "[ 0 0 0 0 0 0 ]");
      expect(blackImages).toHaveLength(2);
      expect(blackImages.every((image) => image.dict.has(PDFName.of("SMask")))).toBe(true);
      for (const name of [texts.signatureLeftName, texts.signatureCenterName, texts.signatureRightName]) expect(drawn.mock.calls.some(([text]) => text === name)).toBe(true);
      const authorityText = drawn.mock.calls.filter(([text, options]) => !text.startsWith("Código de validación:") && (options?.y ?? 999) < 150);
      expect(authorityText.every(([text, options]) => (options?.x ?? 0) >= 68 && options!.x! + options!.font!.widthOfTextAtSize(text, options!.size!) <= 774 && options!.y! >= 78)).toBe(true);
      const institutions = drawn.mock.calls.filter(([text, options]) => text === "Facultad de Tecnología y Ciencias Aplicadas" && options!.y! < 150);
      // El cargo más largo desplaza solo su institución; las otras quedan más cerca de su cargo.
      expect(institutions).toHaveLength(3);
      expect(institutions[0][1]!.y).toBeLessThan(institutions[1][1]!.y!);
      expect(institutions[1][1]!.y).toBe(institutions[2][1]!.y);
      expect(drawn.mock.calls.filter(([text]) => text === "Universidad Nacional de Catamarca")).toHaveLength(4);
      const marcos = await readFile("assets/certificates/firma_marcos.png");
      const natalia = await readFile("assets/certificates/firma_natalia.png");
      const barrera = await readFile("assets/certificates/firma_barrera.jpeg");
      const acosta = await readFile("assets/certificates/firma_acosta.png");
      expect(images.mock.calls.some(([bytes]) => Buffer.isBuffer(bytes) && bytes.equals(marcos))).toBe(false);
      expect(images.mock.calls.some(([bytes]) => Buffer.isBuffer(bytes) && bytes.equals(natalia))).toBe(true);
      expect(images.mock.calls.some(([bytes]) => Buffer.isBuffer(bytes) && bytes.equals(acosta))).toBe(true);
      expect(jpegImages.mock.calls.some(([bytes]) => Buffer.isBuffer(bytes) && bytes.equals(barrera))).toBe(true);
    } finally { drawn.mockRestore(); images.mockRestore(); jpegImages.mockRestore(); }
  });
  it("imprime códigos distintos por emisión aunque el evento y el alumno sean los mismos", async () => {
    const drawn = vi.spyOn(PDFPage.prototype, "drawText");
    try {
      for (const certificateId of ["cert00000000001", "cert00000000002"]) await createCertificatePdf({ certificateId, event: { ...certificateDraft.event, textos_certificado: certificateDraft.textos_certificado } as Parameters<typeof createCertificatePdf>[0]["event"], registration: { id: "same-student", nombres: "Ana", apellidos: "Pérez" } });
      expect(drawn.mock.calls.map(([text]) => text)).toEqual(expect.arrayContaining(["Código de validación: CERT-cert00000000001", "Código de validación: CERT-cert00000000002"]));
    } finally { drawn.mockRestore(); }
  });
  it("incluye todos los integrantes de un grupo extenso en un PDF de varias páginas legibles", async () => {
    const drawn = vi.spyOn(PDFPage.prototype, "drawText");
    try {
      const members = Array.from({ length: 21 }, (_, i) => ({ nombres: "María Alejandra del Valle de los Ángeles", apellidos: "Fernández de la Cruz Rodríguez de Villanueva", documento: String(12000000 + i), role: "Integrante " + i }));
      const bytes = await createCertificatePdf({ event: { id: "event", titulo: "Jornada de exposición", descripcion: "Prueba", slug: "prueba", inicio: "2027-04-02T10:00:00Z", fin: "2027-04-02T12:00:00Z", lugar: "Facultad", cupo: 100, inscripcion_habilitada: false, estado: "finalizado", created: "", updated: "" }, registration: { id: "group", ...members[0] }, members });
      expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
      for (const member of members) expect(drawn.mock.calls.some(([text]) => text.includes(member.documento))).toBe(true);
      const memberCalls = drawn.mock.calls.filter(([text]) => text.includes("Integrante "));
      expect(memberCalls.every(([, options]) => (options?.size ?? 0) >= 9 && (options?.y ?? 0) >= 595 * 0.37)).toBe(true);
    } finally { drawn.mockRestore(); }
  });
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
