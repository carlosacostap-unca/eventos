import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import PocketBase from "pocketbase";
import { pocketBaseSchema } from "../lib/pocketbase/schema";

export async function migrateUnlimitedCapacity(pb: PocketBase, apply = false) {
  const [events, registrations] = await Promise.all([pb.collections.getOne("eventos"), pb.collections.getOne("inscripciones")]);
  const flag = events.fields.find(f => f.name === "cupo_ilimitado");
  const slot = registrations.fields.find(f => f.name === "numero_cupo_publico");
  if ((flag && flag.type !== "bool") || !slot || slot.type !== "number") throw new Error("El esquema de cupos no coincide con el esperado.");
  const changes = [];
  if (!flag) {
    const field = pocketBaseSchema.find(c => c.name === "eventos")!.fields.find(f => f.name === "cupo_ilimitado")!;
    changes.push({ ...events, fields: [...events.fields, field] });
  }
  if (slot.max !== null && slot.max !== undefined) changes.push({ ...registrations, fields: registrations.fields.map(f => f.id === slot.id ? { ...f, max: null } : f) });
  if (apply && changes.length) {
    await pb.collections.import(changes, false);
    const [afterEvents, afterRegistrations] = await Promise.all([pb.collections.getOne(events.id), pb.collections.getOne(registrations.id)]);
    const maximum = afterRegistrations.fields.find(f => f.name === "numero_cupo_publico")?.max;
    if (!afterEvents.fields.some(f => f.name === "cupo_ilimitado" && f.type === "bool") || (maximum !== null && maximum !== undefined)) throw new Error("No se confirmó la configuración de cupo ilimitado.");
  }
  return { aplicado: apply, coleccionesActualizadas: changes.map(c => c.name), limiteAnteriorDelContador: slot.max ?? null, requiereActualizarRegistros: false };
}
async function main() {
  loadEnvConfig(process.cwd());
  const pb = new PocketBase(process.env.POCKETBASE_URL); pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_ADMIN_PASSWORD!);
  console.log(JSON.stringify(await migrateUnlimitedCapacity(pb, process.argv.includes("--apply")), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
