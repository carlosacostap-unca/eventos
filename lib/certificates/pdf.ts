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

import {
  renderCertificateText,
  resolveCertificateTexts,
  type CertificateTextVariables,
  type CertificateTextSections,
} from "@/lib/domain/certificate-texts";
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
  institutionPrimary: string;
  institutionSecondary: string;
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

  const wordmarkWidth = 220;
  input.page.drawImage(uncaWordmark, {
    x: 115,
    y: 486 - ((uncaWordmark.height / uncaWordmark.width) * wordmarkWidth) / 2,
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
  const headerSections = [
    {
      text: input.institutionPrimary,
      font: input.sansBold,
      y: 490,
    },
    {
      text: input.institutionSecondary,
      font: input.sans,
      y: 475,
    },
  ];
  for (const section of headerSections) {
    if (!section.text) continue;
    const size = Math.max(
      6.5,
      Math.min(9.5, (9.5 * 315) / section.font.widthOfTextAtSize(section.text, 9.5)),
    );
    input.page.drawText(section.text, {
      x: headerCenter - section.font.widthOfTextAtSize(section.text, size) / 2,
      y: section.y,
      size,
      font: section.font,
      color: rgb(0.04, 0.04, 0.04),
    });
  }
}

async function drawSignatures(
  document: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  texts: CertificateTextSections,
  variables: CertificateTextVariables,
) {
  const directory = join(process.cwd(), "assets", "certificates");
  const authorities = [
    { file: "firma_marcos.png", center: 240, name: texts.signatureLeftName, role: texts.signatureLeftRole, institution: texts.signatureLeftInstitution },
    { file: "firma_natalia.png", center: 602, name: texts.signatureRightName, role: texts.signatureRightRole, institution: texts.signatureRightInstitution },
  ];
  for (const authority of authorities) {
    const signature = await document.embedPng(await readFile(join(directory, authority.file)));
    const size = signature.scaleToFit(130, 110);
    page.drawImage(signature, {
      x: authority.center - size.width / 2,
      y: 101,
      width: size.width,
      height: size.height,
    });
    [authority.name, authority.role, authority.institution].forEach((template, index) => {
      const text = renderCertificateText(template, variables);
      if (!text) return;
      const size = Math.min(10, 10 * 300 / font.widthOfTextAtSize(text, 10));
      page.drawText(text, {
        x: authority.center - font.widthOfTextAtSize(text, size) / 2,
        y: 97 - index * 12,
        font,
        size,
        color: rgb(0.06, 0.06, 0.06),
      });
    });
  }
}

export async function createCertificatePdf(input: {
  event: EventRecord;
  eventTypeName?: string;
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

  const texts = resolveCertificateTexts(input.event.textos_certificado);
  const participant = [input.registration.apellidos, input.registration.nombres]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
  const date = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(new Date(input.event.inicio));
  const variables: CertificateTextVariables = {
    participante: participant,
    documento: input.registration.documento?.trim() ?? "",
    evento: input.event.titulo.trim(),
    tipoEvento: input.eventTypeName?.trim() || "Evento",
    lugar: input.event.lugar.trim(),
    fecha: date,
  };

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
    await drawDefaultBackground({
      document,
      page,
      sans,
      sansBold,
      institutionPrimary: renderCertificateText(texts.institutionPrimary, variables),
      institutionSecondary: renderCertificateText(texts.institutionSecondary, variables),
    });
  }

  const width = page.getWidth();
  const height = page.getHeight();
  const scaleX = width / PAGE_WIDTH;
  const scaleY = height / PAGE_HEIGHT;
  const textScale = Math.min(scaleX, scaleY);
  const introductionBlock = fitTextBlock({
    text: renderCertificateText(texts.introduction, variables),
    font: serif,
    maxWidth: width * 0.76,
    maxLines: input.template ? 3 : 1,
    preferredSize: 12.5 * textScale,
    minimumSize: 8 * textScale,
  });
  const participantBlock = fitTextBlock({
    text: renderCertificateText(texts.participant, variables),
    font: serifBoldItalic,
    maxWidth: width * 0.72,
    maxLines: 2,
    preferredSize: 30 * textScale,
    minimumSize: 12 * textScale,
  });
  const documentBlock = fitTextBlock({
    text: variables.documento
      ? renderCertificateText(texts.document, variables)
      : "",
    font: serif,
    maxWidth: width * 0.7,
    maxLines: 2,
    preferredSize: 14 * textScale,
    minimumSize: 9 * textScale,
  });
  const participationBlock = fitTextBlock({
    text: renderCertificateText(texts.participation, variables),
    font: serif,
    maxWidth: width * 0.72,
    maxLines: 2,
    preferredSize: 14 * textScale,
    minimumSize: 9 * textScale,
  });
  const eventBlock = fitTextBlock({
    text: renderCertificateText(texts.event, variables),
    font: serifBoldItalic,
    maxWidth: width * 0.7,
    maxLines: 2,
    preferredSize: 24 * textScale,
    minimumSize: 12 * textScale,
  });
  const locationBlock = fitTextBlock({
    text: renderCertificateText(texts.locationAndDate, variables),
    font: serif,
    maxWidth: width * 0.68,
    maxLines: 2,
    preferredSize: 11.5 * textScale,
    minimumSize: 8.5 * textScale,
  });
  const footerBlock = fitTextBlock({
    text: renderCertificateText(texts.footer, variables),
    font: sansBold,
    maxWidth: width * 0.72,
    maxLines: 2,
    preferredSize: 8.5 * textScale,
    minimumSize: 6.5 * textScale,
  });

  drawCenteredBlock({
    page,
    lines: introductionBlock.lines,
    centerY: height * (input.template ? 0.66 : 0.71),
    font: serif,
    size: introductionBlock.size,
    lineHeight: introductionBlock.size * 1.15,
  });
  drawCenteredBlock({
    page,
    lines: participantBlock.lines,
    centerY: height * (input.template ? 0.56 : 0.64),
    font: serifBoldItalic,
    size: participantBlock.size,
    lineHeight: participantBlock.size * 1.08,
  });

  if (documentBlock.lines.length) {
    drawCenteredBlock({
      page,
      lines: documentBlock.lines,
      centerY: height * (input.template ? 0.49 : 0.59),
      font: serif,
      size: documentBlock.size,
      lineHeight: documentBlock.size * 1.12,
    });
  }

  drawCenteredBlock({
    page,
    lines: participationBlock.lines,
    centerY: height * (input.template ? 0.43 : 0.54),
    font: serif,
    size: participationBlock.size,
    lineHeight: participationBlock.size * 1.12,
  });
  drawCenteredBlock({
    page,
    lines: eventBlock.lines,
    centerY: height * (input.template ? 0.35 : 0.46),
    font: serifBoldItalic,
    size: eventBlock.size,
    lineHeight: eventBlock.size * 1.18,
  });
  drawCenteredBlock({
    page,
    lines: locationBlock.lines,
    centerY: height * (input.template ? 0.18 : 0.34),
    font: serif,
    size: locationBlock.size,
    lineHeight: locationBlock.size * 1.18,
  });
  drawCenteredBlock({
    page,
    lines: footerBlock.lines,
    centerY: height * (input.template ? 0.125 : 0.385),
    font: sansBold,
    size: footerBlock.size,
    lineHeight: footerBlock.size * 1.12,
    color: rgb(0.2, 0.2, 0.2),
  });
  if (!input.template) await drawSignatures(document, page, serif, texts, variables);
  page.drawText("ID " + input.event.id + "-" + input.registration.id, {
    x: width * 0.085,
    y: height * 0.105,
    size: 6.5 * textScale,
    font: sans,
    color: rgb(0.42, 0.42, 0.42),
  });

  return document.save();
}
