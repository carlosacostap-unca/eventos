import "server-only";

import { createServicePocketBase } from "@/lib/pocketbase/client";

export async function audit(input: {
  adminId?: string;
  action: string;
  entity: string;
  entityId: string;
  data?: Record<string, unknown>;
}) {
  const pb = await createServicePocketBase();
  await pb.collection("auditoria").create({
    administrador: input.adminId ?? "",
    accion: input.action,
    entidad: input.entity,
    entidad_id: input.entityId,
    datos: input.data ?? {},
  });
}
