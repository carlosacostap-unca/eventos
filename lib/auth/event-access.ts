import "server-only";

import { notFound, redirect } from "next/navigation";
import { getAuthenticatedStaff, type StaffSession } from "@/lib/auth/session";
import { permitsEvent, type EventCapability, type EventRole } from "@/lib/domain/access";
import { createServicePocketBase } from "@/lib/pocketbase/client";

export type EventAccess = StaffSession & { eventRole: EventRole };

export async function getEventAccess(eventId: string, capability: EventCapability = "manage"): Promise<EventAccess | null> {
  const staff = await getAuthenticatedStaff();
  if (!staff || !eventId) return null;
  if (staff.role === "admin") return { ...staff, eventRole: "administrador_evento" };
  try {
    const pb = await createServicePocketBase();
    const assignments = await pb.collection("asignaciones_evento").getList(1, 1, {
      filter: pb.filter("usuario = {:user} && evento = {:event}", { user: staff.adminId, event: eventId }),
      fields: "rol",
    });
    const role = assignments.items[0]?.rol;
    return permitsEvent(role, capability) ? { ...staff, eventRole: role } : null;
  } catch {
    return null;
  }
}

export async function requireEventAccess(eventId: string, capability: EventCapability = "manage") {
  const access = await getEventAccess(eventId, capability);
  if (access) return access;
  if (!(await getAuthenticatedStaff())) redirect("/iniciar-sesion");
  notFound();
}

// Resource URLs carry only a resource ID: resolve its actual event before authorizing.
export async function getResourceAccess(collection: "certificados" | "materiales_evento" | "exposiciones", id: string) {
  if (!(await getAuthenticatedStaff())) return null;
  try {
    const pb = await createServicePocketBase();
    const record = await pb.collection(collection).getOne(id, { fields: "evento" });
    const access = await getEventAccess(String(record.evento));
    return access ? { ...access, eventId: String(record.evento) } : null;
  } catch {
    return null;
  }
}

export async function assignedEventRoles(staff: StaffSession): Promise<Map<string, EventRole>> {
  if (staff.role === "admin") return new Map();
  const pb = await createServicePocketBase();
  const records = await pb.collection("asignaciones_evento").getFullList({
    filter: pb.filter("usuario = {:id}", { id: staff.adminId }), fields: "evento,rol",
  });
  return new Map(records.filter(r => permitsEvent(r.rol, "accredit")).map(r => [String(r.evento), r.rol as EventRole]));
}
