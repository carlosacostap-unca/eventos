import "server-only";
import { createHash } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";
import { presentationFileError, type PresentationFormat } from "@/lib/domain/presentations";

export async function preparePresentation(file: File) {
  const error = presentationFileError(file);
  if (error) throw new DomainError("INVALID", error);
  const bytes = Buffer.from(await file.arrayBuffer());
  const format = file.name.split(".").pop()!.toLowerCase() as PresentationFormat;
  const valid = format === "pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
    : format === "ppt" ? bytes.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex")) && bytes.includes(Buffer.from("PowerPoint Document", "utf16le"))
    : bytes.subarray(0, 4).equals(Buffer.from("504b0304", "hex")) && bytes.includes(Buffer.from("ppt/presentation.xml")) && bytes.includes(Buffer.from("[Content_Types].xml"));
  if (!valid) throw new DomainError("INVALID", "El contenido del archivo no corresponde a un PDF o PowerPoint válido.");
  const mime = format === "pdf" ? "application/pdf" : format === "ppt" ? "application/vnd.ms-powerpoint" : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  return { file: new File([bytes], file.name, { type: mime }), data: {
    presentacion_nombre: file.name, presentacion_tamano: file.size, presentacion_formato: format,
    presentacion_actualizada: new Date().toISOString(), presentacion_huella: createHash("sha256").update(bytes).digest("hex"),
  } };
}
