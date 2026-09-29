import "server-only";

import type { RecordModel } from "pocketbase";
import { DomainError } from "@/lib/domain/errors";
import { materialFileError, type Material } from "@/lib/domain/materials";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { audit } from "@/lib/services/audit";

export async function listMaterials(eventId: string): Promise<Material[]> {
  const pb = await createServicePocketBase();
  return pb.collection("materiales_evento").getFullList<Material>({
    filter: pb.filter("evento = {:eventId}", { eventId }), sort: "created",
  });
}

export async function uploadMaterial(eventId: string, title: string, file: File, adminId: string) {
  const error = materialFileError(file);
  if (error) throw new DomainError("INVALID", error);
  const cleanTitle = title.trim() || file.name;
  if (cleanTitle.length > 160 || file.name.length > 255) {
    throw new DomainError("INVALID", "El título o el nombre del archivo es demasiado largo.");
  }
  const pb = await createServicePocketBase();
  await pb.collection("eventos").getOne(eventId, { fields: "id" });
  const form = new FormData();
  form.set("evento", eventId);
  form.set("titulo", cleanTitle);
  form.set("nombre_original", file.name);
  form.set("tamano", String(file.size));
  form.set("archivo", file);
  const material = await pb.collection("materiales_evento").create<Material>(form);
  await audit({ adminId, action: "material.agregado", entity: "material", entityId: material.id, data: { evento: eventId } });
  return material;
}

export async function deleteMaterial(eventId: string, materialId: string, adminId: string) {
  const pb = await createServicePocketBase();
  const material = await pb.collection("materiales_evento").getOne<Material>(materialId);
  if (material.evento !== eventId) throw new DomainError("NOT_FOUND", "El material no pertenece a este evento.");
  await pb.collection("materiales_evento").delete(materialId);
  await audit({ adminId, action: "material.eliminado", entity: "material", entityId: materialId, data: { evento: eventId } });
}

// La autorización se comprueba antes de obtener un token de archivo o contactar al storage.
export async function getMaterialDownload(materialId: string, access: { admin: true } | { registrationIds: string[] }) {
  const pb = await createServicePocketBase();
  if (!("admin" in access) && !access.registrationIds.length) throw new DomainError("UNAUTHORIZED", "Material no disponible.");
  const material = await pb.collection("materiales_evento").getOne<Material & RecordModel>(materialId);
  if (!("admin" in access)) {
    const ids = access.registrationIds.map((id) => `(${pb.filter("id = {:id}", { id })})`).join(" || ");
    const eligible = await pb.collection("inscripciones").getList(1, 1, {
      filter: `(${ids}) && ` + pb.filter("evento = {:eventId} && acreditado = true", { eventId: material.evento }),
      fields: "id",
    });
    if (!eligible.totalItems) throw new DomainError("UNAUTHORIZED", "Material no disponible.");
  }
  const token = await pb.files.getToken();
  const response = await fetch(pb.files.getURL(material, material.archivo, { token }), { cache: "no-store" });
  if (!response.ok || !response.body) throw new Error("No se pudo descargar el material.");
  return { body: response.body, filename: material.nombre_original };
}
