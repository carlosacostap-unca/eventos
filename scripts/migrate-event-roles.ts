import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import PocketBase, { ClientResponseError } from "pocketbase";
import { pocketBaseSchema } from "../lib/pocketbase/schema";

export async function migrateEventRoles(pb: PocketBase, apply = false) {
  const users = await pb.collections.getOne("administradores");
  const expectedUsers = pocketBaseSchema.find(c => c.name === "administradores")!;
  const role = users.fields.find(f => f.name === "role");
  if (!role || role.type !== "select") throw new Error("El rol de personal no coincide con el esquema esperado.");
  const expectedAssignments = pocketBaseSchema.find(c => c.name === "asignaciones_evento")!;
  let assignments;
  try { assignments = await pb.collections.getOne("asignaciones_evento"); }
  catch (error) { if (!(error instanceof ClientResponseError) || error.status !== 404) throw error; }
  if (assignments && assignments.id !== expectedAssignments.id) throw new Error("La colección de asignaciones tiene un identificador inesperado.");
  const changes = [
    { ...users, listRule: expectedUsers.listRule, viewRule: expectedUsers.viewRule, createRule: expectedUsers.createRule, updateRule: expectedUsers.updateRule, fields: users.fields.map(f => f.id === role.id ? { ...f, values: [...new Set([...role.values, "admin", "personal"])] } : f) },
    assignments ? { ...assignments, ...Object.fromEntries(["listRule", "viewRule", "createRule", "updateRule", "deleteRule"].map(k => [k, expectedAssignments[k]])) } : expectedAssignments,
  ];
  if (apply) await pb.collections.import(changes, false);
  return { aplicado: apply, colecciones: changes.map(c => c.name), requiereActualizarRegistros: false };
}

async function main() {
  loadEnvConfig(process.cwd());
  const pb = new PocketBase(process.env.POCKETBASE_URL); pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_ADMIN_PASSWORD!);
  console.log(JSON.stringify(await migrateEventRoles(pb, process.argv.includes("--apply")), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
