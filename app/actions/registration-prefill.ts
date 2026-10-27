"use server";

import { headers } from "next/headers";
import { registrationDocumentSchema, type RegistrationPrefillResult } from "@/lib/domain/registration-prefill";
import { getEventById } from "@/lib/services/events";
import { allowRegistrationPrefill, findRegistrationIdentity } from "@/lib/services/registration-prefill";
import { findEditableRegistration } from "@/lib/services/public-registration-edit";

export async function lookupRegistrationPersonAction(eventId: string, document: string, includeRegistration = false): Promise<RegistrationPrefillResult> {
  const parsed = registrationDocumentSchema.safeParse(document);
  if (!parsed.success) return { message: "Ingresá un DNI o documento válido." };
  try {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip")?.trim() || "origen-desconocido";
    if (!await allowRegistrationPrefill(origin)) return { message: "Alcanzaste el límite de consultas. Podés completar los datos manualmente o intentar más tarde." };
    const event = await getEventById(eventId);
    if (!event || event.estado !== "publicado" || !event.inscripcion_habilitada || new Date(event.fin).getTime() <= Date.now()) {
      return { message: "La consulta no está disponible para este evento. Podés completar los datos manualmente." };
    }
    if (includeRegistration) {
      const registration = await findEditableRegistration(parsed.data, eventId);
      if (registration) return { registration, person: registration.principal, message: "Ya estás inscripto en este evento. Podés actualizar tus datos y cambiar la modalidad de inscripción." };
    }
    const person = await findRegistrationIdentity(parsed.data, eventId);
    return person
      ? { person, message: "Encontramos tus datos. Revisalos y corregí lo que necesites antes de confirmar." }
      : { message: "No encontramos datos para ese documento. Completalos para continuar." };
  } catch {
    return { message: "No pudimos consultar tus datos. Podés completarlos manualmente." };
  }
}
