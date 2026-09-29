export const MATERIAL_MAX_BYTES = 25 * 1024 * 1024;
export const MATERIAL_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "gif", "ppt", "pptx", "pps", "ppsx", "odp", "doc", "docx", "odt", "xls", "xlsx", "ods"] as const;
export const MATERIAL_ACCEPT = MATERIAL_EXTENSIONS.map((extension) => "." + extension).join(",");

export type Material = {
  id: string;
  evento: string;
  titulo: string;
  nombre_original: string;
  archivo: string;
  tamano: number;
};

export function materialFileError(file: File): string | null {
  if (!file.size) return "Seleccioná un archivo que no esté vacío.";
  if (file.size > MATERIAL_MAX_BYTES) return "El archivo supera el máximo de 25 MB.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!MATERIAL_EXTENSIONS.some((allowed) => allowed === extension)) {
    return "Usá imágenes, PDF, PowerPoint o documentos de Office/OpenDocument.";
  }
  return null;
}

export function materialSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
