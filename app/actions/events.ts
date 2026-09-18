"use server";

import { ClientResponseError } from "pocketbase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/app/actions/state";
import { parseArgentinaDateTime } from "@/lib/domain/dates";
import { requireAdmin } from "@/lib/auth/session";
import { eventInputSchema } from "@/lib/domain/models";
import { audit } from "@/lib/services/audit";
import {
  createEvent,
  updateCertificateTemplate,
  updateEvent,
} from "@/lib/services/events";
import { validateCertificateTemplate } from "@/lib/certificates/pdf";

function inputFromForm(formData: FormData) {
  return {
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion"),
    slug: formData.get("slug"),
    inicio: parseArgentinaDateTime(formData.get("inicio")),
    fin: parseArgentinaDateTime(formData.get("fin")),
    lugar: formData.get("lugar"),
    cupo: formData.get("cupo"),
    inscripcionHabilitada: formData.get("inscripcionHabilitada") === "on",
    estado: formData.get("estado"),
  };
}

function errorState(error: unknown): ActionState {
  if (error instanceof ClientResponseError && error.status === 400) {
    return { message: "No se pudo guardar. Revisá que el identificador público sea único." };
  }
  return { message: "No se pudo guardar el evento. Intentá nuevamente." };
}

export async function createEventAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = eventInputSchema.safeParse(inputFromForm(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };

  let event;
  try {
    event = await createEvent(parsed.data);
    await audit({
      adminId: admin.adminId,
      action: "evento.creado",
      entity: "evento",
      entityId: event.id,
      data: { slug: event.slug },
    });
  } catch (error) {
    return errorState(error);
  }
  redirect("/admin/eventos/" + event.id);
}

export async function updateEventAction(
  id: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = eventInputSchema.safeParse(inputFromForm(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };

  try {
    await updateEvent(id, parsed.data);
    await audit({
      adminId: admin.adminId,
      action: "evento.actualizado",
      entity: "evento",
      entityId: id,
      data: { slug: parsed.data.slug, cupo: parsed.data.cupo },
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/eventos/" + id);
  redirect("/admin/eventos/" + id);
}

export async function uploadTemplateAction(eventId: string, formData: FormData) {
  const admin = await requireAdmin();
  const file = formData.get("plantilla");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/eventos/" + eventId + "/certificados?error=archivo");
  }
  try {
    await validateCertificateTemplate(file);
    await updateCertificateTemplate(eventId, file);
    await audit({
      adminId: admin.adminId,
      action: "certificado.plantilla_actualizada",
      entity: "evento",
      entityId: eventId,
      data: { tipo: file.type, tamano: file.size },
    });
  } catch {
    redirect("/admin/eventos/" + eventId + "/certificados?error=plantilla");
  }
  revalidatePath("/admin/eventos/" + eventId + "/certificados");
  redirect("/admin/eventos/" + eventId + "/certificados?ok=plantilla");
}
