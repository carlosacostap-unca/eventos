"use server";
import { revalidatePath } from "next/cache";
import { requireEventAccess } from "@/lib/auth/event-access";
import type { ActionState } from "./state";
import { saveModality, copyModalities } from "@/lib/services/modalities";
import { registerWithModality } from "@/lib/services/modal-registration";
import { DomainError } from "@/lib/domain/errors";
import { FormValidationError } from "@/lib/domain/modalities";
import { z } from "zod";
import { updateExhibition } from "@/lib/services/exhibition-edit";
import { getEventById } from "@/lib/services/events";

async function refreshEvent(eventId: string) {
  for (const suffix of ["", "/inscritos", "/modalidades", "/acreditacion", "/exposiciones", "/certificados", "/reportes"]) revalidatePath("/admin/eventos/" + eventId + suffix);
  const event = await getEventById(eventId);
  if (event) revalidatePath("/" + event.slug);
}

export async function saveModalityAction(eventId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const admin = await requireEventAccess(eventId);
  try {
    const template = data.get("plantilla");
    await saveModality(eventId, JSON.parse(String(data.get("payload"))), admin.adminId, template instanceof File ? template : undefined);
  } catch (e) { return { message: e instanceof DomainError ? e.message : e instanceof z.ZodError ? e.issues.map((i) => i.message).join(". ") : "No se pudo guardar. Revisá la configuración y que la base esté preparada para modalidades." }; }
  await refreshEvent(eventId);
  return { ok: true, message: "Modalidad guardada. Las nuevas inscripciones usarán la configuración publicada." };
}
export async function copyModalitiesAction(eventId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const admin = await requireEventAccess(eventId);
  await requireEventAccess(String(data.get("origen")));
  try { await copyModalities(String(data.get("origen")), eventId, admin.adminId); }
  catch (e) { return { message: e instanceof DomainError ? e.message : "No se pudieron copiar las modalidades." }; }
  await refreshEvent(eventId);
  return { ok: true, message: "Configuración copiada sin participantes ni certificados emitidos." };
}
export async function registerConfiguredAction(eventId: string, presencial: boolean, _state: ActionState, data: FormData): Promise<ActionState> {
  const admin = presencial ? await requireEventAccess(eventId, "accredit") : undefined;
  const raw = String(data.get("payload") ?? "");
  if (raw.length > 200000) return { message: "El formulario supera el tamaño permitido." };
  const editToken = !presencial ? String(data.get("editToken") ?? "") : "";
  try { await registerWithModality(eventId, JSON.parse(raw), { presencial, allowOverCapacity: admin?.eventRole === "administrador_evento" && data.get("confirmarExcepcion") === "on", strictCapacity: admin?.eventRole === "acreditador", adminId: admin?.adminId, ...(editToken ? { editToken } : {}) }); }
  catch (e) {
    if (e instanceof FormValidationError) return { message: e.message, fields: e.fields };
    return { message: e instanceof DomainError ? e.message : "No pudimos confirmar la inscripción. Intentá nuevamente o consultá con la organización." };
  }
  await refreshEvent(eventId);
  return { ok: true, message: presencial ? "La inscripción se guardó y la persona principal quedó acreditada." : editToken ? "Tu inscripción fue actualizada. Guardamos tus datos y la modalidad elegida." : "Tu inscripción quedó confirmada. Te esperamos en el evento." };
}

export async function updateExhibitionAction(eventId: string, groupId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const admin = await requireEventAccess(eventId);
  try { await updateExhibition(eventId, groupId, JSON.parse(String(data.get("payload"))), admin.adminId); }
  catch (e) { if (e instanceof FormValidationError) return { message: e.message, fields: e.fields }; return { message: e instanceof DomainError ? e.message : "No se pudo guardar la exposición." }; }
  await refreshEvent(eventId);
  return { ok: true, message: "Integrantes y respuestas guardados. Los certificados afectados requieren regeneración." };
}
