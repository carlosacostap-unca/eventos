import { z } from "zod";

const certificateTextSection = (label: string, max: number) =>
  z.string().trim().max(max, label + " es demasiado largo");

export const certificateTextInputSchema = z.object({
  institutionPrimary: certificateTextSection("El encabezado principal", 120),
  institutionSecondary: certificateTextSection("El encabezado secundario", 120),
  introduction: certificateTextSection("La introducción", 300),
  participant: certificateTextSection("La sección del participante", 180),
  document: certificateTextSection("La sección del documento", 120),
  participation: certificateTextSection("La descripción de la participación", 240),
  event: certificateTextSection("La sección del evento", 240),
  locationAndDate: certificateTextSection("La sección de lugar y fecha", 240),
  signatureLeftName: certificateTextSection("El nombre de la firma izquierda", 120),
  signatureLeftRole: certificateTextSection("El cargo de la firma izquierda", 120),
  signatureLeftInstitution: certificateTextSection("La institución de la firma izquierda", 160),
  signatureRightName: certificateTextSection("El nombre de la firma derecha", 120),
  signatureRightRole: certificateTextSection("El cargo de la firma derecha", 120),
  signatureRightInstitution: certificateTextSection("La institución de la firma derecha", 160),
});

export type CertificateTextSections = z.infer<typeof certificateTextInputSchema>;

export const DEFAULT_CERTIFICATE_TEXTS: CertificateTextSections = {
  institutionPrimary: "Facultad de Tecnología y Ciencias Aplicadas",
  institutionSecondary: "Universidad Nacional de Catamarca",
  introduction:
    "La Facultad de Tecnología y Ciencias Aplicadas de la Universidad Nacional de Catamarca certifica que",
  participant: "{participante}",
  document: "DNI N° {documento}",
  participation: "ha participado de la actividad de tipo {tipoEvento} de {horas} horas:",
  event: "{evento}",
  locationAndDate: "{lugar}, {fecha}",
  signatureLeftName: "Ms. Ing. Marcos Darío ARANDA",
  signatureLeftRole: "Secretario de Posgrado",
  signatureLeftInstitution: "Facultad de Tecnología y Ciencias Aplicadas",
  signatureRightName: "Mgter. Lic. Natalia FERNÁNDEZ",
  signatureRightRole: "Decana",
  signatureRightInstitution: "Facultad de Tecnología y Ciencias Aplicadas",
};

export const CERTIFICATE_TEXT_KEYS = Object.keys(
  DEFAULT_CERTIFICATE_TEXTS,
) as (keyof CertificateTextSections)[];

export function resolveCertificateTexts(input: unknown): CertificateTextSections {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ...DEFAULT_CERTIFICATE_TEXTS };
  }

  const source = input as Record<string, unknown>;
  const resolved = { ...DEFAULT_CERTIFICATE_TEXTS };

  for (const key of CERTIFICATE_TEXT_KEYS) {
    const parsed = certificateTextInputSchema.shape[key].safeParse(source[key]);
    if (parsed.success) resolved[key] = parsed.data;
  }

  return resolved;
}

export type CertificateTextVariables = {
  participante: string;
  documento: string;
  evento: string;
  tipoEvento?: string;
  horas?: string;
  lugar: string;
  fecha: string;
};

export function renderCertificateText(
  template: string,
  variables: CertificateTextVariables,
): string {
  return template
    .replace(
      /\{(participante|documento|evento|tipoEvento|horas|lugar|fecha)\}/g,
      (_match, key: keyof CertificateTextVariables) => variables[key] ?? (key === "tipoEvento" ? "Evento" : ""),
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function certificateDurationHours(start: string, end: string): string {
  const hours = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("El evento debe tener una duración válida para emitir el certificado.");
  }
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(hours);
}
