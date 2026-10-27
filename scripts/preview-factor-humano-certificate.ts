import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createCertificatePdf } from "../lib/certificates/pdf";
import { resolveCertificateTexts, certificateTextInputSchema } from "../lib/domain/certificate-texts";
import type { EventRecord } from "../lib/domain/models";

async function main() {
  const speakerPreview = process.argv.includes("--expositora");
  const config = JSON.parse(await readFile("assets/certificates/eventos/por-que-falla-la-tecnologia.json", "utf8"));
  if (config.event.id !== config.eventId) throw new Error("El evento de la muestra no coincide con la configuración.");
  const speakerConfig = speakerPreview ? JSON.parse(await readFile("assets/certificates/eventos/por-que-falla-la-tecnologia-expositora.json", "utf8")) : undefined;
  if (speakerConfig && speakerConfig.eventId !== config.eventId) throw new Error("La expositora no corresponde al evento de la muestra.");
  const texts = certificateTextInputSchema.parse({ ...resolveCertificateTexts(undefined), ...config.textos_certificado, ...speakerConfig?.textos_certificado });
  const event: EventRecord = { ...config.event, descripcion: "Muestra de certificado", estado: "publicado", inscripcion_habilitada: true, cupo: 120, created: "", updated: "", textos_certificado: texts };
  const registration = speakerConfig
    ? { id: "muestra-expositora", nombres: speakerConfig.speaker.nombres, apellidos: speakerConfig.speaker.apellidos }
    : { id: "muestra", nombres: "NOMBRE DEL PARTICIPANTE", apellidos: "APELLIDO", documento: "00.000.000" };
  const bytes = await createCertificatePdf({ event, eventTypeName: config.eventTypeName, registration });
  const document = await PDFDocument.load(bytes);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const label = speakerPreview ? "MUESTRA - PENDIENTE DE EMISIÓN" : "MUESTRA - DATOS FICTICIOS";
  for (const page of document.getPages()) page.drawText(label, { x: (page.getWidth() - font.widthOfTextAtSize(label, 8)) / 2, y: 526, size: 8, font, color: rgb(0.45, 0.45, 0.45) });
  if (speakerPreview) for (const page of document.getPages()) {
    page.drawRectangle({ x: 70, y: 61, width: 270, height: 12, color: rgb(1, 1, 1) });
    page.drawText("Muestra - sin código de emisión", { x: 71.5, y: 64, size: 6.5, font, color: rgb(0.42, 0.42, 0.42) });
  }
  await mkdir("output/pdf", { recursive: true });
  const path = speakerPreview ? "output/pdf/muestra-certificado-factor-humano-expositora.pdf" : "output/pdf/muestra-certificado-factor-humano-tres-firmas.pdf";
  await writeFile(path, await document.save());
  console.log(JSON.stringify({ output: path, pages: document.getPageCount(), authorities: [texts.signatureLeftName, texts.signatureCenterName, texts.signatureRightName], pendingSignatureImages: [] }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
