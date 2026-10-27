"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./state";
import { registrationDocumentSchema } from "@/lib/domain/registration-prefill";
import { DomainError } from "@/lib/domain/errors";
import { allowRegistrationPrefill } from "@/lib/services/registration-prefill";
import { getEventById } from "@/lib/services/events";
import { findPresentationWorks, uploadExhibitionPresentation, type PresentationWork } from "@/lib/services/presentations";
import type { PresentationInfo } from "@/lib/domain/presentations";

export type PresentationLookup = ActionState & { token?: string; document?: string; works?: PresentationWork[] };
export async function lookupPresentationsAction(eventId: string, _state: PresentationLookup, data: FormData): Promise<PresentationLookup> {
  const parsed = registrationDocumentSchema.safeParse(data.get("documento"));
  if (!parsed.success) return { message: "Ingresá un DNI o documento válido." };
  try {
    const request = await headers();
    const origin = request.get("x-forwarded-for")?.split(",")[0]?.trim() || request.get("x-real-ip")?.trim() || "origen-desconocido";
    if (!await allowRegistrationPrefill(origin)) return { message: "Alcanzaste el límite de consultas. Intentá más tarde." };
    const event = await getEventById(eventId);
    if (!event || event.estado !== "publicado") return { message: "La entrega no está disponible para este evento." };
    const result = await findPresentationWorks(eventId, parsed.data);
    if (!result.works.length) return { message: "No encontramos trabajos para entregar con este DNI. Usá el DNI del alumno expositor responsable o del segundo alumno expositor." };
    return { ok: true, document: parsed.data, ...result };
  } catch { return { message: "No pudimos consultar tus trabajos. Intentá nuevamente." }; }
}
export async function uploadPresentationAction(eventId: string, exhibitionId: string, _state: ActionState, data: FormData): Promise<ActionState & { presentation?: PresentationInfo }> {
  const file = data.get("presentacion");
  if (!(file instanceof File) || !file.size) return { message: "Seleccioná la presentación que querés entregar." };
  try {
    const presentation = await uploadExhibitionPresentation(eventId, exhibitionId, String(data.get("documento") ?? ""), String(data.get("token") ?? ""), String(data.get("revision") ?? ""), file);
    revalidatePath(`/admin/eventos/${eventId}/exposiciones`);
    return { ok: true, message: "Presentación final guardada. La organización ya puede verla y descargarla.", presentation };
  } catch (error) { return { message: error instanceof DomainError ? error.message : "No se pudo guardar la presentación. Conservamos la versión anterior; intentá nuevamente." }; }
}
