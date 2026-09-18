import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { EventRecord, RegistrationRecord } from "@/lib/domain/models";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

export async function validateCertificateTemplate(file: File) {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("La plantilla no puede superar 10 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "application/pdf") {
    const document = await PDFDocument.load(bytes);
    if (document.getPageCount() < 1) throw new Error("El PDF no contiene páginas.");
    const { width, height } = document.getPage(0).getSize();
    if (width < 400 || height < 280) throw new Error("La plantilla es demasiado pequeña.");
    return;
  }
  if (file.type !== "image/png" && file.type !== "image/jpeg") {
    throw new Error("La plantilla debe ser PDF, PNG o JPG.");
  }
  const document = await PDFDocument.create();
  const image =
    file.type === "image/png"
      ? await document.embedPng(bytes)
      : await document.embedJpg(bytes);
  if (image.width < 800 || image.height < 560) {
    throw new Error("La imagen debe medir al menos 800 × 560 píxeles.");
  }
}

function centeredX(text: string, width: number, fontSize: number, fontWidth: number) {
  return (width - (fontWidth * fontSize) / 1000) / 2;
}

export async function createCertificatePdf(input: {
  event: EventRecord;
  registration: Pick<RegistrationRecord, "id" | "nombres" | "apellidos">;
  template?: { bytes: Uint8Array; mimeType: string };
}): Promise<Uint8Array> {
  let document: PDFDocument;
  let page;

  if (input.template?.mimeType.includes("pdf")) {
    const source = await PDFDocument.load(input.template.bytes);
    document = await PDFDocument.create();
    const [copied] = await document.copyPages(source, [0]);
    page = document.addPage(copied);
  } else {
    document = await PDFDocument.create();
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    if (input.template) {
      const image = input.template.mimeType.includes("png")
        ? await document.embedPng(input.template.bytes)
        : await document.embedJpg(input.template.bytes);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
      });
    } else {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
        color: rgb(0.965, 0.95, 0.91),
      });
      page.drawRectangle({
        x: 24,
        y: 24,
        width: page.getWidth() - 48,
        height: page.getHeight() - 48,
        borderColor: rgb(0.12, 0.23, 0.35),
        borderWidth: 3,
      });
    }
  }

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const height = page.getHeight();
  const participant = (input.registration.nombres + " " + input.registration.apellidos).trim();
  const title = "CERTIFICADO DE ASISTENCIA";
  const sentence = "Por su participación en";
  const eventTitle = input.event.titulo;
  const date = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(input.event.inicio));

  page.drawText(title, {
    x: centeredX(title, width, 25, bold.widthOfTextAtSize(title, 1000)),
    y: height * 0.69,
    size: 25,
    font: bold,
    color: rgb(0.08, 0.17, 0.27),
  });
  page.drawText(participant, {
    x: centeredX(participant, width, 30, bold.widthOfTextAtSize(participant, 1000)),
    y: height * 0.51,
    size: 30,
    font: bold,
    color: rgb(0.04, 0.3, 0.28),
  });
  page.drawText(sentence, {
    x: centeredX(sentence, width, 14, regular.widthOfTextAtSize(sentence, 1000)),
    y: height * 0.42,
    size: 14,
    font: regular,
    color: rgb(0.15, 0.2, 0.25),
  });
  page.drawText(eventTitle.slice(0, 76), {
    x: centeredX(
      eventTitle.slice(0, 76),
      width,
      19,
      bold.widthOfTextAtSize(eventTitle.slice(0, 76), 1000),
    ),
    y: height * 0.34,
    size: 19,
    font: bold,
    color: rgb(0.08, 0.17, 0.27),
  });
  const footer = input.event.lugar + " · " + date;
  page.drawText(footer.slice(0, 100), {
    x: centeredX(
      footer.slice(0, 100),
      width,
      11,
      regular.widthOfTextAtSize(footer.slice(0, 100), 1000),
    ),
    y: height * 0.18,
    size: 11,
    font: regular,
    color: rgb(0.25, 0.29, 0.32),
  });
  page.drawText("ID " + input.event.id + "-" + input.registration.id, {
    x: 36,
    y: 32,
    size: 7,
    font: regular,
    color: rgb(0.4, 0.4, 0.4),
  });

  return document.save();
}
