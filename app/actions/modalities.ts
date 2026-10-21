"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import type { ActionState } from "./state";
import { saveModality, copyModalities } from "@/lib/services/modalities";
import { registerWithModality } from "@/lib/services/modal-registration";
import { DomainError } from "@/lib/domain/errors";
import { FormValidationError } from "@/lib/domain/modalities";
import { z } from "zod";
import { updateExhibition } from "@/lib/services/exhibition-edit";
import { getEventById } from "@/lib/services/events";

async function refreshEvent(eventId: string) {
  for (const suffix of ["", "/modalidades", "/acreditacion", "/exposiciones", "/certificados", "/reportes"]) revalidatePath("/admin/eventos/" + eventId + suffix);
  const event = await getEventById(eventId);
  if (event) revalidatePath("/" + event.slug);
}

export async function saveModalityAction(eventId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const template = data.get("plantilla");
    await saveModality(eventId, JSON.parse(String(data.get("payload"))), admin.adminId, template instanceof File ? template : undefined);
  } catch (e) { return { message: e instanceof DomainError ? e.message : e instanceof z.ZodError ? e.issues.map((i) => i.message).join(". ") : "No se pudo guardar. Revisá la configuración y que la base esté preparada para modalidades." }; }
  await refreshEvent(eventId);
  return { ok: true, message: "Modalidad guardada. Las nuevas inscripciones usarán la configuración publicada." };
}
export async function copyModalitiesAction(eventId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try { await copyModalities(String(data.get("origen")), eventId, admin.adminId); }
  catch (e) { return { message: e instanceof DomainError ? e.message : "No se pudieron copiar las modalidades." }; }
  await refreshEvent(eventId);
  return { ok: true, message: "Configuración copiada sin participantes ni certificados emitidos." };
}
export async function registerConfiguredAction(eventId: string, presencial: boolean, _state: ActionState, data: FormData): Promise<ActionState> {
  const admin = presencial ? await requireAdmin() : undefined;
  const raw = String(data.get("payload") ?? "");
  if (raw.length > 200000) return { message: "El formulario supera el tamaño permitido." };
  try { await registerWithModality(eventId, JSON.parse(raw), { presencial, allowOverCapacity: data.get("confirmarExcepcion") === "on", adminId: admin?.adminId }); }
  catch (e) {
    if (e instanceof FormValidationError) return { message: e.message, fields: e.fields };
    return { message: e instanceof DomainError ? e.message : "No pudimos confirmar la inscripción. Intentá nuevamente o consultá con la organización." };
  }
  await refreshEvent(eventId);
  return { ok: true, message: presencial ? "La inscripción se guardó y la persona principal quedó acreditada." : "Tu inscripción quedó confirmada. Te esperamos en el evento." };
}

export async function updateExhibitionAction(eventId: string, groupId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try { await updateExhibition(eventId, groupId, JSON.parse(String(data.get("payload"))), admin.adminId); }
  catch (e) { if (e instanceof FormValidationError) return { message: e.message, fields: e.fields }; return { message: e instanceof DomainError ? e.message : "No se pudo guardar la exposición." }; }
  await refreshEvent(eventId);
  return { ok: true, message: "Integrantes y respuestas guardados. Los certificados afectados requieren regeneración." };
}
