"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/app/actions/state";
import { requireAdmin } from "@/lib/auth/session";
import { speakerInputSchema } from "@/lib/domain/models";
import { validateSpeakerPhoto } from "@/lib/domain/speakers";
import { audit } from "@/lib/services/audit";
import { getEventById } from "@/lib/services/events";
import {
  createSpeaker,
  getSpeakerById,
  isSpeakerLinkedToEvent,
  linkSpeakerToEvent,
  listSpeakerEventIds,
  unlinkSpeakerFromEvent,
  updateSpeaker,
} from "@/lib/services/speakers";

function inputFromForm(formData: FormData) {
  return {
    titulo: formData.get("titulo"),
    nombre: formData.get("nombre"),
    universidades: formData.get("universidades"),
  };
}

function refreshEvent(eventId: string, slug: string) {
  revalidatePath("/admin/eventos/" + eventId + "/disertantes");
  revalidatePath("/admin/eventos/" + eventId);
  revalidatePath("/" + slug);
}

export async function createSpeakerAction(
  eventId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = speakerInputSchema.safeParse(inputFromForm(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };
  const validation = await validateSpeakerPhoto(formData.get("foto"), true);
  if (validation.error || !validation.photo) {
    return { fields: { foto: [validation.error || "Seleccioná una foto."] } };
  }

  const event = await getEventById(eventId);
  if (!event) return { message: "El evento ya no existe." };
  try {
    const speaker = await createSpeaker(eventId, parsed.data, validation.photo);
    await audit({
      adminId: admin.adminId,
      action: "disertante.creado",
      entity: "disertante",
      entityId: speaker.id,
      data: { evento: eventId, nombre: speaker.nombre },
    });
  } catch {
    return { message: "No se pudo agregar el disertante. Revisá la foto e intentá nuevamente." };
  }
  refreshEvent(eventId, event.slug);
  redirect("/admin/eventos/" + eventId + "/disertantes");
}

export async function linkExistingSpeakerAction(
  eventId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const speakerId = formData.get("disertante");
  if (typeof speakerId !== "string" || !/^[a-z0-9]{15}$/.test(speakerId)) {
    return { fields: { disertante: ["Seleccioná un disertante."] } };
  }
  const [event, speaker] = await Promise.all([
    getEventById(eventId),
    getSpeakerById(speakerId),
  ]);
  if (!event || !speaker) return { message: "El evento o el disertante ya no existe." };

  try {
    const linked = await linkSpeakerToEvent(eventId, speakerId);
    if (!linked) return { message: "Este disertante ya participa en el evento." };
    await audit({
      adminId: admin.adminId,
      action: "disertante.vinculado",
      entity: "disertante",
      entityId: speakerId,
      data: { evento: eventId, nombre: speaker.nombre },
    });
  } catch {
    return { message: "No se pudo vincular el disertante. Intentá nuevamente." };
  }
  refreshEvent(eventId, event.slug);
  redirect("/admin/eventos/" + eventId + "/disertantes");
}

export async function updateSpeakerAction(
  eventId: string,
  speakerId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = speakerInputSchema.safeParse(inputFromForm(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };
  const validation = await validateSpeakerPhoto(formData.get("foto"), false);
  if (validation.error) return { fields: { foto: [validation.error] } };

  const [event, speaker, linked] = await Promise.all([
    getEventById(eventId),
    getSpeakerById(speakerId),
    isSpeakerLinkedToEvent(eventId, speakerId),
  ]);
  if (!event || !speaker || !linked) {
    return { message: "El disertante no pertenece a este evento." };
  }
  try {
    await updateSpeaker(speakerId, parsed.data, validation.photo);
    await audit({
      adminId: admin.adminId,
      action: "disertante.actualizado",
      entity: "disertante",
      entityId: speakerId,
      data: { evento: eventId, nombre: parsed.data.nombre },
    });
  } catch {
    return { message: "No se pudo guardar el disertante. Intentá nuevamente." };
  }
  const eventIds = await listSpeakerEventIds(speakerId);
  const events = await Promise.all(eventIds.map(getEventById));
  for (const linkedEvent of events) {
    if (linkedEvent) refreshEvent(linkedEvent.id, linkedEvent.slug);
  }
  redirect("/admin/eventos/" + eventId + "/disertantes");
}

export async function unlinkSpeakerAction(eventId: string, speakerId: string) {
  const admin = await requireAdmin();
  const [event, speaker] = await Promise.all([
    getEventById(eventId),
    getSpeakerById(speakerId),
  ]);
  if (!event || !speaker || !(await unlinkSpeakerFromEvent(eventId, speakerId))) {
    redirect("/admin/eventos/" + eventId + "/disertantes");
  }
  await audit({
    adminId: admin.adminId,
    action: "disertante.desvinculado",
    entity: "disertante",
    entityId: speakerId,
    data: { evento: eventId, nombre: speaker.nombre },
  });
  refreshEvent(eventId, event.slug);
  redirect("/admin/eventos/" + eventId + "/disertantes");
}
