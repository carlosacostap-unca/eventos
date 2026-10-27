import { PDFDocument, PDFTextField, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { renderCertificateText, type CertificateTextSections, type CertificateTextVariables } from "@/lib/domain/certificate-texts";
import { CERTIFICATE_CODE_LABEL } from "./verification-code";

const fieldNames = ["certificado.cuerpo", "certificado.integrantes", "certificado.fecha"] as const;
type FieldName = typeof fieldNames[number];
type Box = { x: number; y: number; width: number; height: number; size: number };
export type CertificateLayout = Partial<Record<FieldName, Box>>;
type Run = { text: string; bold?: boolean };
type Word = Run[];

// Las áreas editables de la plantilla determinan la composición, sin asociarla a un evento.
export function readCertificateLayout(source: PDFDocument): CertificateLayout | null {
  const form = source.getForm();
  const fields = form.getFields();
  if (!fields.some(f => f.getName() === "certificado.cuerpo")) return null;
  const result: CertificateLayout = {};
  const page = source.getPage(0);
  for (const name of fieldNames) {
    const field = fields.find(f => f.getName() === name);
    if (!field) continue;
    if (!(field instanceof PDFTextField) || field.acroField.getWidgets().length !== 1) throw new Error("Cada área de certificado debe ser un campo de texto único.");
    const widget = field.acroField.getWidgets()[0];
    const box = widget.getRectangle();
    const appearance = field.acroField.getDefaultAppearance() ?? "";
    const size = Number(appearance.match(/([\d.]+)\s+Tf\b/)?.[1] ?? 14);
    const widgetPage = widget.P();
    if ((widgetPage && widgetPage.toString() !== page.ref.toString()) || !Object.values(box).every(Number.isFinite) || box.x < 0 || box.y < 0 || box.width < 40 || box.height < 12 || box.x + box.width > page.getWidth() + 0.01 || box.y + box.height > page.getHeight() + 0.01 || size < 9 || size > 30) throw new Error("Revisá la posición y el tamaño de las áreas de la plantilla.");
    result[name] = { ...box, size };
  }
  if (!result["certificado.cuerpo"]) return null;
  const boxes = Object.values(result);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) throw new Error("Las áreas de la plantilla no deben superponerse.");
  }
  for (const field of fields) if (fieldNames.includes(field.getName() as FieldName)) {
    // pdf-lib elimina el campo pero puede dejar referencias de widgets en Annots.
    for (const widget of field.acroField.getWidgets()) {
      const reference = source.context.getObjectRef(widget.dict);
      if (reference) page.node.removeAnnot(reference);
    }
    form.removeField(field);
  }
  return result;
}

function words(runs: Run[]): Word[] {
  const result: Word[] = [];
  let current: Word = [];
  for (const run of runs) for (const token of run.text.split(/(\s+)/).filter(Boolean)) {
    if (/^\s+$/.test(token)) { if (current.length) result.push(current); current = []; }
    else current.push({ ...run, text: token });
  }
  if (current.length) result.push(current);
  return result;
}

function wrap(runs: Run[], size: number, width: number, fonts: { regular: PDFFont; bold: PDFFont }): Word[][] {
  const font = (r: Run) => r.bold ? fonts.bold : fonts.regular;
  const measure = (word: Word) => word.reduce((n, run) => n + font(run).widthOfTextAtSize(run.text, size), 0);
  const space = fonts.regular.widthOfTextAtSize(" ", size);
  const pieces: Word[] = [];
  for (const word of words(runs)) {
    if (measure(word) <= width) { pieces.push(word); continue; }
    let part: Word = [], used = 0;
    for (const run of word) for (const character of run.text) {
      const advance = font(run).widthOfTextAtSize(character, size);
      if (part.length && used + advance > width) { pieces.push(part); part = []; used = 0; }
      part.push({ ...run, text: character }); used += advance;
    }
    if (part.length) pieces.push(part);
  }
  const lines: Word[][] = []; let line: Word[] = [], used = 0;
  for (const word of pieces) {
    const advance = measure(word);
    if (line.length && used + space + advance > width) { lines.push(line); line = []; used = 0; }
    used += (line.length ? space : 0) + advance; line.push(word);
  }
  if (line.length) lines.push(line);
  return lines;
}

function textRuns(template: string, variables: CertificateTextVariables, bold = false): Run[] {
  return template.split(/(\{campo:[a-z][a-z0-9_]{0,39}\})/).filter(Boolean).map(part => ({ text: (/^\s/.test(part) ? " " : "") + renderCertificateText(part, variables) + (/\s$/.test(part) ? " " : ""), bold: bold || part.startsWith("{campo:") }));
}

export async function drawCertificateLayout(input: {
  document: PDFDocument; page: PDFPage; source: PDFDocument; layout: CertificateLayout;
  texts: CertificateTextSections; variables: CertificateTextVariables; identifier: string;
  members?: Array<{ nombres: string; apellidos: string; documento: string; role: string }>;
}) {
  const italic = await input.document.embedFont(StandardFonts.TimesRomanItalic);
  const bold = await input.document.embedFont(StandardFonts.TimesRomanBoldItalic);
  const roman = await input.document.embedFont(StandardFonts.TimesRoman);
  const sans = await input.document.embedFont(StandardFonts.HelveticaOblique);
  const body = [
    textRuns(input.texts.introduction, input.variables),
    textRuns(input.texts.participant || (input.members?.length ? "{participante}" : ""), input.variables, true),
    textRuns(input.texts.document || (input.members?.length ? "D.N.I. {documento}" : ""), input.variables),
    textRuns(input.texts.participation, input.variables),
    textRuns(input.texts.event, input.variables, true),
  ].filter(runs => runs.some(r => r.text)).flatMap((runs, i) => [...(i ? [{ text: " " }] : []), ...runs]);
  // La persona principal ya figura con DNI en el cuerpo; las otras funciones se detallan debajo.
  const normalized = (value: string) => value.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase();
  const linked = input.members?.filter(m => normalized(m.documento) !== normalized(input.variables.documento)) ?? [];
  const paragraphs: Record<FieldName, Run[][]> = {
    "certificado.cuerpo": [body],
    "certificado.integrantes": linked.map(m => [{ text: `${m.role}: ${m.apellidos}, ${m.nombres}; D.N.I. ${m.documento}.` }]),
    "certificado.fecha": [[{ text: renderCertificateText(input.texts.locationAndDate, input.variables) }]],
  };
  if (linked.length && !input.layout["certificado.integrantes"]) throw new Error("El certificado compartido necesita el área certificado.integrantes en la plantilla.");
  const blocks = fieldNames.flatMap(name => {
    const box = input.layout[name]; if (!box || !paragraphs[name].some(p => p.some(r => r.text))) return [];
    const fonts = { regular: name === "certificado.integrantes" ? sans : name === "certificado.fecha" ? roman : italic, bold };
    let size = box.size;
    let lines = paragraphs[name].flatMap(p => wrap(p, size, box.width, fonts).map((line, i, all) => ({ line, last: i === all.length - 1 })));
    while (size > 9 && lines.length * size * 1.25 > box.height) {
      size = Math.max(9, size - 0.5);
      lines = paragraphs[name].flatMap(p => wrap(p, size, box.width, fonts).map((line, i, all) => ({ line, last: i === all.length - 1 })));
    }
    const perPage = Math.floor(box.height / (size * 1.25));
    if (perPage < 1) throw new Error("Un área de la plantilla es demasiado pequeña para texto legible.");
    return [{ name, box, fonts, size, lines, perPage }];
  });
  const pageCount = Math.max(1, ...blocks.map(b => Math.ceil(b.lines.length / b.perPage)));
  let page = input.page;
  for (let index = 0; index < pageCount; index++) {
    if (index) { const [copy] = await input.document.copyPages(input.source, [0]); page = input.document.addPage(copy); }
    for (const block of blocks) {
      let y = block.box.y + block.box.height - block.size;
      for (const { line, last } of block.lines.slice(index * block.perPage, (index + 1) * block.perPage)) {
        const wordWidth = line.reduce((n, word) => n + word.reduce((total, run) => total + (run.bold ? block.fonts.bold : block.fonts.regular).widthOfTextAtSize(run.text, block.size), 0), 0);
        const naturalSpace = block.fonts.regular.widthOfTextAtSize(" ", block.size);
        const gap = block.name === "certificado.cuerpo" && !last && line.length > 1 ? (block.box.width - wordWidth) / (line.length - 1) : naturalSpace;
        let x = block.box.x;
        for (const word of line) {
          for (const run of word) {
            const font = run.bold ? block.fonts.bold : block.fonts.regular;
            page.drawText(run.text, { x, y, font, size: block.size, color: rgb(0.06, 0.06, 0.06) });
            x += font.widthOfTextAtSize(run.text, block.size);
          }
          x += gap;
        }
        y -= block.size * 1.25;
      }
    }
    page.drawText(CERTIFICATE_CODE_LABEL + " " + input.identifier + (pageCount > 1 ? ` · ${index + 1}/${pageCount}` : ""), { x: 80, y: 14, size: 6, font: roman, color: rgb(0.4, 0.4, 0.4) });
  }
}
