import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createCertificatePdf } from "../lib/certificates/pdf";
import { resolveCertificateTexts, certificateTextInputSchema } from "../lib/domain/certificate-texts";
import type { EventRecord } from "../lib/domain/models";

async function main() {
  const config = JSON.parse(await readFile("assets/certificates/eventos/por-que-falla-la-tecnologia.json", "utf8"));
  if (config.event.id !== config.eventId) throw new Error("El evento de la muestra no coincide con la configuración.");
  const texts = certificateTextInputSchema.parse({ ...resolveCertificateTexts(undefined), ...config.textos_certificado });
  const event: EventRecord = { ...config.event, descripcion: "Muestra de certificado", estado: "publicado", inscripcion_habilitada: true, cupo: 120, created: "", updated: "", textos_certificado: texts };
  const bytes = await createCertificatePdf({ event, eventTypeName: config.eventTypeName, registration: { id: "muestra", nombres: "NOMBRE DEL PARTICIPANTE", apellidos: "APELLIDO", documento: "00.000.000" } });
  const document = await PDFDocument.load(bytes);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const label = "MUESTRA - DATOS FICTICIOS";
  for (const page of document.getPages()) page.drawText(label, { x: (page.getWidth() - font.widthOfTextAtSize(label, 8)) / 2, y: 526, size: 8, font, color: rgb(0.45, 0.45, 0.45) });
  await mkdir("output/pdf", { recursive: true });
  const path = "output/pdf/muestra-certificado-factor-humano-tres-firmas.pdf";
  await writeFile(path, await document.save());
  console.log(JSON.stringify({ output: path, pages: document.getPageCount(), authorities: [texts.signatureLeftName, texts.signatureCenterName, texts.signatureRightName], pendingSignatureImages: [] }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
