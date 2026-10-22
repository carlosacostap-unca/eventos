"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createStaff, saveAssignment, revokeAssignment } from "@/lib/services/staff";
import type { ActionState } from "./state";
import { z } from "zod";
import { ClientResponseError } from "pocketbase";

export async function createStaffAction(_state: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  try { await createStaff(Object.fromEntries(data)); }
  catch (e) {
    if (e instanceof z.ZodError) return { fields: e.flatten().fieldErrors, message: "Revisá los datos de la cuenta." };
    return { message: e instanceof ClientResponseError && e.status === 400 ? "No se pudo crear la cuenta. Revisá si el email ya está registrado." : "No se pudo crear la cuenta." };
  }
  revalidatePath("/admin/personal");
  return { ok: true, message: "Cuenta creada. Ya podés asignarla al equipo de un evento." };
}

export async function saveAssignmentAction(eventId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  await requireAdmin();
  try { await saveAssignment(eventId, Object.fromEntries(data)); }
  catch { return { message: "No se pudo guardar la asignación. Revisá la cuenta y el rol." }; }
  revalidatePath(`/admin/eventos/${eventId}/equipo`); revalidatePath("/admin");
  return { ok: true, message: "Asignación guardada." };
}

export async function revokeAssignmentAction(eventId: string, assignmentId: string) {
  await requireAdmin();
  await revokeAssignment(eventId, assignmentId);
  revalidatePath(`/admin/eventos/${eventId}/equipo`); revalidatePath("/admin");
}
