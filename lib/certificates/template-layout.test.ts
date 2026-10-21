import { describe, expect, it, vi } from "vitest";
import { PDFDocument, PDFPage, StandardFonts } from "pdf-lib";
import { createCertificatePdf, validateCertificateTemplate } from "./pdf";
import type { EventRecord } from "@/lib/domain/models";

const event: EventRecord = { id: "jornada", titulo: "XII Jornadas Estudiantiles de Investigación e Innovación Tecnológica", descripcion: "Prueba", slug: "jornada", inicio: "2026-11-03T12:00:00Z", fin: "2026-11-03T16:00:00Z", lugar: "Catamarca", cupo: 100, estado: "publicado", inscripcion_habilitada: true, created: "", updated: "", textos_certificado: { introduction: "Por cuanto,", participant: "{participante},", document: "D.N.I. {documento},", participation: "ha participado como expositor de la comunicación oral: «{campo:titulo_trabajo}».", event: "", locationAndDate: "Catamarca, {fecha}." } };
async function template(overlap = false) {
  const pdf = await PDFDocument.create(); const page = pdf.addPage([792, 612]);
  const font = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  for (const [name, y, height] of [["cuerpo", 280, 115], ["integrantes", overlap ? 300 : 230, 45], ["fecha", 195, 25]] as const) {
    const field = pdf.getForm().createTextField("certificado." + name);
    field.addToPage(page, { x: 80, y, width: 635, height, font, borderWidth: 0 }); field.setFontSize(16);
  }
  pdf.getForm().updateFieldAppearances(font);
  return { bytes: await pdf.save(), mimeType: "application/pdf" };
}
describe("plantillas PDF con composición propia", () => {
  it("incluye el título y todos los integrantes en áreas independientes y elimina los campos interactivos", async () => {
    const background = await template(); const drawn = vi.spyOn(PDFPage.prototype, "drawText");
    try {
      const members = [{ nombres: "Ana", apellidos: "Pérez", documento: "12000001", role: "Alumno expositor" }, { nombres: "Luis", apellidos: "Gómez", documento: "12000002", role: "Director" }, { nombres: "María", apellidos: "Sosa", documento: "12000003", role: "Codirector" }];
      const bytes = await createCertificatePdf({ template: background, event, registration: { id: "alumno", ...members[0], respuestas: { titulo_trabajo: "Robótica aplicada" } }, members });
      const result = await PDFDocument.load(bytes);
      expect(result.getPageCount()).toBe(1);
      expect(result.getPage(0).getSize()).toEqual({ width: 792, height: 612 });
      expect(result.getForm().getFields()).toHaveLength(0);
      expect(result.getPage(0).node.Annots()?.size() ?? 0).toBe(0);
      const words = drawn.mock.calls.map(([text]) => text);
      for (const text of ["Robótica", "12000001,", "12000002.", "12000003.", "Director:", "Codirector:"]) {
        expect(words).toContain(text);
      }
      const title = drawn.mock.calls.find(([text]) => text === "Robótica");
      expect(title?.[1]?.font?.name).toContain("BoldItalic");
      expect(drawn.mock.calls.filter(([text]) => text !== "ID jornada-alumno").every(([, options]) => (options?.size ?? 0) >= 9)).toBe(true);
    } finally { drawn.mockRestore(); }
  });
  it("continúa grupos extensos en otras páginas conservando todos sus DNI y el área de firmas", async () => {
    const background = await template(); const drawn = vi.spyOn(PDFPage.prototype, "drawText");
    try {
      const members = Array.from({ length: 21 }, (_, i) => ({ nombres: "María Alejandra del Valle de los Ángeles", apellidos: "Fernández de la Cruz Rodríguez", documento: String(15000000 + i), role: i ? "Integrante" : "Alumno expositor" }));
      const bytes = await createCertificatePdf({ event, template: background, registration: { id: "alumno", ...members[0], respuestas: { titulo_trabajo: "Investigación" } }, members });
      expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
      for (const person of members) expect(drawn.mock.calls.some(([text]) => text.includes(person.documento))).toBe(true);
      const linked = drawn.mock.calls.filter(([text]) => text.startsWith("150000") && !text.includes(members[0].documento));
      expect(linked.every(([, options]) => (options?.y ?? 0) >= 230 && (options?.y ?? 0) <= 275)).toBe(true);
    } finally { drawn.mockRestore(); }
  });
  it("rechaza áreas superpuestas antes de guardar una plantilla", async () => {
    const { bytes } = await template(true);
    await expect(validateCertificateTemplate(new File([Buffer.from(bytes)], "superpuesta.pdf", { type: "application/pdf" }))).rejects.toThrow("superponerse");
  });
});
