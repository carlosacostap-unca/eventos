import "server-only";
import { ClientResponseError } from "pocketbase";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { audit } from "@/lib/services/audit";

export const staffInput = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.email().transform(v => v.trim().toLowerCase()),
  password: z.string().min(12, "Usá al menos 12 caracteres.").max(128),
});
export const assignmentInput = z.object({
  usuario: z.string().regex(/^[a-z0-9]{15}$/),
  rol: z.enum(["administrador_evento", "acreditador"]),
});

export async function listStaff() {
  await requireAdmin();
  const pb = await createServicePocketBase();
  return pb.collection("administradores").getFullList({ filter: 'role = "personal"', fields: "id,nombre,email", sort: "nombre" });
}

export async function createStaff(raw: unknown) {
  const actor = await requireAdmin();
  const input = staffInput.parse(raw);
  const pb = await createServicePocketBase();
  const user = await pb.collection("administradores").create({ ...input, passwordConfirm: input.password, role: "personal", emailVisibility: true });
  await audit({ adminId: actor.adminId, action: "personal.creado", entity: "administrador", entityId: user.id });
  return user.id;
}

export async function listAssignments(eventId: string) {
  await requireAdmin();
  const pb = await createServicePocketBase();
  return pb.collection("asignaciones_evento").getFullList({ filter: pb.filter("evento = {:id}", { id: eventId }), expand: "usuario", fields: "id,usuario,rol,expand.usuario.id,expand.usuario.nombre,expand.usuario.email" });
}

export async function saveAssignment(eventId: string, raw: unknown) {
  const actor = await requireAdmin();
  const input = assignmentInput.parse(raw);
  const pb = await createServicePocketBase();
  await pb.collection("eventos").getOne(eventId, { fields: "id" });
  const user = await pb.collection("administradores").getOne(input.usuario, { fields: "id,role" });
  if (user.role !== "personal") throw new Error("Seleccioná una cuenta operativa.");
  const rows = await pb.collection("asignaciones_evento").getFullList({ filter: pb.filter("evento = {:event} && usuario = {:user}", { event: eventId, user: input.usuario }) });
  if (rows[0]) await pb.collection("asignaciones_evento").update(rows[0].id, { rol: input.rol });
  else await pb.collection("asignaciones_evento").create({ ...input, evento: eventId });
  await audit({ adminId: actor.adminId, action: "equipo.asignado", entity: "evento", entityId: eventId, data: input });
}

export async function revokeAssignment(eventId: string, assignmentId: string) {
  const actor = await requireAdmin();
  const pb = await createServicePocketBase();
  let record;
  try { record = await pb.collection("asignaciones_evento").getOne(assignmentId); }
  catch (e) { if (e instanceof ClientResponseError && e.status === 404) return; throw e; }
  if (record.evento !== eventId) throw new Error("La asignación no pertenece a este evento.");
  await pb.collection("asignaciones_evento").delete(assignmentId);
  await audit({ adminId: actor.adminId, action: "equipo.revocado", entity: "evento", entityId: eventId, data: { usuario: record.usuario, rol: record.rol } });
}
