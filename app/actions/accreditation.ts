"use server";

import { revalidatePath } from "next/cache";
import { requireEventAccess } from "@/lib/auth/event-access";
import { accreditationDocumentSchema, type AccreditationLookup } from "@/lib/domain/accreditation";
import { registrationInputSchema } from "@/lib/domain/models";
import { DomainError } from "@/lib/domain/errors";
import { confirmAccreditation, findAccreditationPerson } from "@/lib/services/accreditation";
import type { ActionState } from "./state";

export async function lookupAccreditationAction(eventId: string, document: string): Promise<AccreditationLookup> {
  await requireEventAccess(eventId, "accredit");
  const parsed = accreditationDocumentSchema.safeParse(document);
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    const person = await findAccreditationPerson(eventId, parsed.data);
    return { document: parsed.data, ...(person ? { person } : {}) };
  } catch {
    return { message: "No pudimos consultar el DNI. Revisá la conexión e intentá nuevamente." };
  }
}

export async function confirmAccreditationAction(eventId: string, registrationId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const staff = await requireEventAccess(eventId, "accredit");
  const parsed = registrationInputSchema.safeParse(Object.fromEntries(["nombres", "apellidos", "documento", "email"].map((key) => [key, data.get(key)])));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };
  try {
    await confirmAccreditation(eventId, registrationId, parsed.data, staff.adminId);
  } catch (error) {
    return { message: error instanceof DomainError ? error.message : "No pudimos confirmar la acreditación. Revisá la conexión e intentá nuevamente." };
  }
  for (const suffix of ["", "/acreditacion", "/acreditacion/listado", "/inscritos", "/reportes", "/certificados"]) revalidatePath("/admin/eventos/" + eventId + suffix);
  return { ok: true, message: "Acreditación confirmada." };
}
