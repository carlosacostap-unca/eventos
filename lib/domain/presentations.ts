export const PRESENTATION_MAX_BYTES = 25 * 1024 * 1024;
export const PRESENTATION_ACCEPT = ".pdf,.ppt,.pptx";
export type PresentationFormat = "pdf" | "ppt" | "pptx";
export type PresentationInfo = { filename: string; size: number; format: PresentationFormat; uploadedAt: string; revision: string };
export type PresentationFields = {
  presentacion_final?: string;
  presentacion_nombre?: string;
  presentacion_tamano?: number;
  presentacion_formato?: PresentationFormat;
  presentacion_actualizada?: string;
  presentacion_huella?: string;
};
export function presentationFileError(file: Pick<File, "size" | "name">): string | null {
  if (!file.size) return "Seleccioná un archivo que no esté vacío.";
  if (file.size > PRESENTATION_MAX_BYTES) return "La presentación supera el máximo de 25 MB.";
  if (file.name.length > 200 || /[\x00-\x1f\x7f/\\]/.test(file.name)) return "Usá un nombre de archivo válido de hasta 200 caracteres.";
  if (!/\.(pdf|ppt|pptx)$/i.test(file.name)) return "La presentación debe ser PDF o PowerPoint (.ppt o .pptx).";
  return null;
}
export function presentationInfo(group: PresentationFields): PresentationInfo | undefined {
  if (!group.presentacion_final) return;
  const uploaded = new Date(group.presentacion_actualizada ?? "");
  return { filename: group.presentacion_nombre || group.presentacion_final, size: group.presentacion_tamano || 0,
    format: group.presentacion_formato || "pdf", uploadedAt: Number.isFinite(uploaded.getTime()) ? uploaded.toISOString() : "",
    revision: group.presentacion_huella || group.presentacion_final };
}
