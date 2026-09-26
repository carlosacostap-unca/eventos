import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import type { EventRecord, RegistrationRecord } from "@/lib/domain/models";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const DEFAULT_ASSET_DIRECTORY = join(
  process.cwd(),
  "public",
  "images",
  "certificates",
);

type DefaultCertificateAssets = {
  crest: Uint8Array;
  frame: Uint8Array;
  uncaWordmark: Uint8Array;
};

let defaultAssetsPromise: Promise<DefaultCertificateAssets> | undefined;

function loadDefaultCertificateAssets() {
  defaultAssetsPromise ??= Promise.all([
    readFile(join(DEFAULT_ASSET_DIRECTORY, "escudo-ftyca.png")),
    readFile(join(DEFAULT_ASSET_DIRECTORY, "marco-griego.jpg")),
    readFile(join(DEFAULT_ASSET_DIRECTORY, "marca-unca.png")),
  ]).then(([crest, frame, uncaWordmark]) => ({
    crest,
    frame,
    uncaWordmark,
  }));
  return defaultAssetsPromise;
}

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

function centeredX(text: string, pageWidth: number, font: PDFFont, fontSize: number) {
  return (pageWidth - font.widthOfTextAtSize(text, fontSize)) / 2;
}

function splitLongWord(word: string, font: PDFFont, size: number, maxWidth: number) {
  const pieces: string[] = [];
  let current = "";

  for (const character of word) {
    const candidate = current + character;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      pieces.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  if (current) pieces.push(current);
  return pieces;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const originalWord of words) {
    const parts =
      font.widthOfTextAtSize(originalWord, size) > maxWidth
        ? splitLongWord(originalWord, font, size, maxWidth)
        : [originalWord];

    for (const word of parts) {
      const candidate = current ? current + " " + word : word;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
  }

  if (current) lines.push(current);
  return lines;
}

function fitTextBlock(input: {
  text: string;
  font: PDFFont;
  maxWidth: number;
  maxLines: number;
  preferredSize: number;
  minimumSize: number;
}) {
  for (let size = input.preferredSize; size >= input.minimumSize; size -= 0.5) {
    const lines = wrapText(input.text, input.font, size, input.maxWidth);
    if (lines.length <= input.maxLines) return { lines, size };
  }

  return {
    lines: wrapText(input.text, input.font, input.minimumSize, input.maxWidth),
    size: input.minimumSize,
  };
}

function drawCenteredLine(input: {
  page: PDFPage;
  text: string;
  y: number;
  font: PDFFont;
  size: number;
  color?: RGB;
}) {
  input.page.drawText(input.text, {
    x: centeredX(input.text, input.page.getWidth(), input.font, input.size),
    y: input.y,
    size: input.size,
    font: input.font,
    color: input.color ?? rgb(0.06, 0.06, 0.06),
  });
}

function drawCenteredBlock(input: {
  page: PDFPage;
  lines: string[];
  centerY: number;
  font: PDFFont;
  size: number;
  lineHeight?: number;
  color?: RGB;
}) {
  const lineHeight = input.lineHeight ?? input.size * 1.2;
  const firstY = input.centerY + ((input.lines.length - 1) * lineHeight) / 2;

  input.lines.forEach((line, index) => {
    drawCenteredLine({
      page: input.page,
      text: line,
      y: firstY - index * lineHeight,
      font: input.font,
      size: input.size,
      color: input.color,
    });
  });
}

async function drawDefaultBackground(input: {
  document: PDFDocument;
  page: PDFPage;
  sans: PDFFont;
  sansBold: PDFFont;
}) {
  const assets = await loadDefaultCertificateAssets();
  const [frame, crest, uncaWordmark] = await Promise.all([
    input.document.embedJpg(assets.frame),
    input.document.embedPng(assets.crest),
    input.document.embedPng(assets.uncaWordmark),
  ]);
  const width = input.page.getWidth();
  const height = input.page.getHeight();
  const frameScale = Math.min((width - 28) / frame.width, (height - 28) / frame.height);
  const frameWidth = frame.width * frameScale;
  const frameHeight = frame.height * frameScale;

  input.page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(1, 1, 1),
  });
  input.page.drawImage(frame, {
    x: (width - frameWidth) / 2,
    y: (height - frameHeight) / 2,
    width: frameWidth,
    height: frameHeight,
  });

  const wordmarkWidth = 150;
  input.page.drawImage(uncaWordmark, {
    x: 115,
    y: 466,
    width: wordmarkWidth,
    height: (uncaWordmark.height / uncaWordmark.width) * wordmarkWidth,
  });

  const crestWidth = 55;
  input.page.drawImage(crest, {
    x: 505,
    y: 454,
    width: crestWidth,
    height: (crest.height / crest.width) * crestWidth,
  });

  const headerCenter = 675;
  const faculty = "Facultad de Tecnología y Ciencias Aplicadas";
  const university = "Universidad Nacional de Catamarca";
  input.page.drawText(faculty, {
    x: headerCenter - input.sansBold.widthOfTextAtSize(faculty, 9.5) / 2,
    y: 490,
    size: 9.5,
    font: input.sansBold,
    color: rgb(0.04, 0.04, 0.04),
  });
  input.page.drawText(university, {
    x: headerCenter - input.sans.widthOfTextAtSize(university, 9.5) / 2,
    y: 475,
    size: 9.5,
    font: input.sans,
    color: rgb(0.04, 0.04, 0.04),
  });
}

export async function createCertificatePdf(input: {
  event: EventRecord;
  registration: Pick<
    RegistrationRecord,
    "id" | "nombres" | "apellidos"
  > &
    Partial<Pick<RegistrationRecord, "documento">>;
  template?: { bytes: Uint8Array; mimeType: string };
}): Promise<Uint8Array> {
  let document: PDFDocument;
  let page: PDFPage;

  if (input.template?.mimeType.includes("pdf")) {
    const source = await PDFDocument.load(input.template.bytes);
    document = await PDFDocument.create();
    const [copied] = await document.copyPages(source, [0]);
    page = document.addPage(copied);
  } else {
    document = await PDFDocument.create();
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  }

  const sans = await document.embedFont(StandardFonts.Helvetica);
  const sansBold = await document.embedFont(StandardFonts.HelveticaBold);
  const serif = await document.embedFont(StandardFonts.TimesRoman);
  const serifBoldItalic = await document.embedFont(StandardFonts.TimesRomanBoldItalic);

  if (input.template && !input.template.mimeType.includes("pdf")) {
    const image = input.template.mimeType.includes("png")
      ? await document.embedPng(input.template.bytes)
      : await document.embedJpg(input.template.bytes);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
    });
  } else if (!input.template) {
    await drawDefaultBackground({ document, page, sans, sansBold });
  }

  const width = page.getWidth();
  const height = page.getHeight();
  const scaleX = width / PAGE_WIDTH;
  const scaleY = height / PAGE_HEIGHT;
  const textScale = Math.min(scaleX, scaleY);
  const participant = [input.registration.apellidos, input.registration.nombres]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
  const participantBlock = fitTextBlock({
    text: participant,
    font: serifBoldItalic,
    maxWidth: width * 0.72,
    maxLines: 2,
    preferredSize: 30 * textScale,
    minimumSize: 12 * textScale,
  });
  const eventBlock = fitTextBlock({
    text: input.event.titulo,
    font: serifBoldItalic,
    maxWidth: width * 0.7,
    maxLines: 3,
    preferredSize: 24 * textScale,
    minimumSize: 14 * textScale,
  });
  const date = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(new Date(input.event.inicio));
  const locationAndDate = [input.event.lugar.trim(), date].filter(Boolean).join(", ");
  const locationBlock = fitTextBlock({
    text: locationAndDate,
    font: serif,
    maxWidth: width * 0.68,
    maxLines: 2,
    preferredSize: 11.5 * textScale,
    minimumSize: 8.5 * textScale,
  });

  drawCenteredLine({
    page,
    text:
      "La Facultad de Tecnología y Ciencias Aplicadas de la Universidad Nacional de Catamarca certifica que",
    y: height * 0.66,
    font: serif,
    size: 12.5 * textScale,
  });
  drawCenteredBlock({
    page,
    lines: participantBlock.lines,
    centerY: height * 0.56,
    font: serifBoldItalic,
    size: participantBlock.size,
    lineHeight: participantBlock.size * 1.08,
  });

  if (input.registration.documento?.trim()) {
    drawCenteredLine({
      page,
      text: "DNI N° " + input.registration.documento.trim(),
      y: height * 0.49,
      font: serif,
      size: 14 * textScale,
    });
  }

  drawCenteredLine({
    page,
    text: "por su participación en la actividad",
    y: height * 0.43,
    font: serif,
    size: 14 * textScale,
  });
  drawCenteredBlock({
    page,
    lines: eventBlock.lines,
    centerY: height * 0.35,
    font: serifBoldItalic,
    size: eventBlock.size,
    lineHeight: eventBlock.size * 1.18,
  });
  drawCenteredBlock({
    page,
    lines: locationBlock.lines,
    centerY: height * 0.18,
    font: serif,
    size: locationBlock.size,
    lineHeight: locationBlock.size * 1.18,
  });
  drawCenteredLine({
    page,
    text: "Facultad de Tecnología y Ciencias Aplicadas",
    y: height * 0.125,
    font: sansBold,
    size: 8.5 * textScale,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText("ID " + input.event.id + "-" + input.registration.id, {
    x: width * 0.085,
    y: height * 0.105,
    size: 6.5 * textScale,
    font: sans,
    color: rgb(0.42, 0.42, 0.42),
  });

  return document.save();
}
