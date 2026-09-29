"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/app/actions/state";
import { requireAdmin } from "@/lib/auth/session";
import { DomainError } from "@/lib/domain/errors";
import { uploadMaterial, deleteMaterial } from "@/lib/services/materials";

function refreshMaterials(eventId: string) {
  revalidatePath(`/admin/eventos/${eventId}/materiales`);
  revalidatePath("/mis-certificados/resultados");
}

export async function uploadMaterialAction(eventId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const file = form.get("archivo");
  if (!(file instanceof File)) return { message: "Seleccioná un archivo." };
  try {
    await uploadMaterial(eventId, String(form.get("titulo") || ""), file, admin.adminId);
  } catch (error) {
    return { message: error instanceof DomainError ? error.message : "No se pudo subir el material. Intentá nuevamente." };
  }
  refreshMaterials(eventId);
  return { ok: true, message: "El material se subió y está disponible para los asistentes acreditados." };
}

export async function deleteMaterialAction(eventId: string, materialId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    await deleteMaterial(eventId, materialId, admin.adminId);
  } catch (error) {
    return { message: error instanceof DomainError ? error.message : "No se pudo eliminar el material." };
  }
  refreshMaterials(eventId);
  return { ok: true };
}
