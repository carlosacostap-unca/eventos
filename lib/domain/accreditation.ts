import { z } from "zod";
import { normalizeDocument, type RegistrationInput, type RegistrationRecord } from "./models";

export const accreditationDocumentSchema = z.string().trim().max(32)
  .regex(/^[\d.\s-]+$/, "Ingresá el DNI usando solamente números.")
  .transform(normalizeDocument)
  .pipe(z.string().regex(/^\d{5,10}$/, "Ingresá un DNI válido, de 5 a 10 números."));

export type AccreditationPerson = RegistrationInput & Pick<RegistrationRecord, "id" | "acreditado" | "acreditado_en">;
export type AccreditationLookup = { person?: AccreditationPerson; document?: string; message?: string };
