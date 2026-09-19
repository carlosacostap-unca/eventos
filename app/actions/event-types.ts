"use server";

import { ClientResponseError } from "pocketbase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/app/actions/state";
import { requireAdmin } from "@/lib/auth/session";
import { eventTypeInputSchema } from "@/lib/domain/models";
import { audit } from "@/lib/services/audit";
import { createEventType, getEventTypeById, updateEventType } from "@/lib/services/event-types";

function inputFromForm(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion"),
    activo: formData.get("activo") === "on",
  };
}

function saveError(error: unknown): ActionState {
  if (error instanceof ClientResponseError && error.status === 400) {
    return { message: "No se pudo guardar. Revisá que el nombre no esté repetido." };
  }
  return { message: "No se pudo guardar el tipo de evento. Intentá nuevamente." };
}

export async function createEventTypeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = eventTypeInputSchema.safeParse(inputFromForm(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };
  let type;
  try {
    type = await createEventType(parsed.data);
    await audit({
      adminId: admin.adminId,
      action: "tipo_evento.creado",
      entity: "tipo_evento",
      entityId: type.id,
      data: { nombre: type.nombre },
    });
  } catch (error) {
    return saveError(error);
  }
  revalidatePath("/admin/tipos");
  redirect("/admin/tipos");
}

export async function updateEventTypeAction(
  id: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = eventTypeInputSchema.safeParse(inputFromForm(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };
  try {
    if (!(await getEventTypeById(id))) return { message: "El tipo de evento ya no existe." };
    await updateEventType(id, parsed.data);
    await audit({
      adminId: admin.adminId,
      action: "tipo_evento.actualizado",
      entity: "tipo_evento",
      entityId: id,
      data: { nombre: parsed.data.nombre, activo: parsed.data.activo },
    });
  } catch (error) {
    return saveError(error);
  }
  revalidatePath("/admin/tipos");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin/tipos");
}
