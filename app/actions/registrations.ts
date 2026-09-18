"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/app/actions/state";
import { requireAdmin } from "@/lib/auth/session";
import { DomainError } from "@/lib/domain/errors";
import { registrationInputSchema } from "@/lib/domain/models";
import { getEventBySlug } from "@/lib/services/events";
import {
  createWalkIn,
  registerPublic,
  setAttendance,
} from "@/lib/services/registrations";

function registrationFromForm(formData: FormData) {
  return {
    nombres: formData.get("nombres"),
    apellidos: formData.get("apellidos"),
    email: formData.get("email"),
    documento: formData.get("documento"),
  };
}

export async function registerAction(
  slug: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registrationInputSchema.safeParse(registrationFromForm(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };

  const event = await getEventBySlug(slug);
  if (!event) return { message: "El evento no existe." };

  try {
    await registerPublic(event, parsed.data);
    revalidatePath("/eventos/" + slug);
    return {
      ok: true,
      message: "Tu inscripción quedó confirmada. Te esperamos en el evento.",
    };
  } catch (error) {
    if (error instanceof DomainError) return { message: error.message };
    return { message: "No pudimos registrar la inscripción. Intentá nuevamente." };
  }
}

export async function toggleAttendanceAction(formData: FormData) {
  const admin = await requireAdmin();
  const registrationId = String(formData.get("registrationId") || "");
  const eventId = String(formData.get("eventId") || "");
  const accredited = formData.get("accredited") === "true";
  if (!registrationId || !eventId) return;
  await setAttendance(registrationId, accredited, admin.adminId);
  revalidatePath("/admin/eventos/" + eventId);
  revalidatePath("/admin/eventos/" + eventId + "/acreditacion");
  revalidatePath("/admin/eventos/" + eventId + "/reportes");
}

export async function createWalkInAction(
  eventId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = registrationInputSchema.safeParse(registrationFromForm(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };

  try {
    await createWalkIn(
      eventId,
      parsed.data,
      admin.adminId,
      formData.get("confirmarExcepcion") === "on",
    );
    revalidatePath("/admin/eventos/" + eventId);
    revalidatePath("/admin/eventos/" + eventId + "/acreditacion");
    return { ok: true, message: "La persona fue agregada y acreditada." };
  } catch (error) {
    if (error instanceof DomainError) return { message: error.message };
    return { message: "No se pudo registrar a la persona." };
  }
}
