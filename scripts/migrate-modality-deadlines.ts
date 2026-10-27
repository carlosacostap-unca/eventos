import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import PocketBase, { type CollectionModel } from "pocketbase";
import { modalityDeadlineFields } from "../lib/pocketbase/modality-deadlines-schema";

export async function migrateModalityDeadlines(pb: PocketBase, apply = false) {
  const current = await pb.collections.getOne("modalidades_inscripcion");
  if (!current.fields.some((field) => field.name === "evento" && field.type === "relation") || !current.fields.some((field) => field.name === "codigo" && field.type === "text")) throw new Error("Primero prepará el esquema de modalidades.");
  for (const expected of modalityDeadlineFields) {
    const saved = current.fields.find((field) => field.name === expected.name);
    if (saved && saved.type !== expected.type) throw new Error("El campo " + expected.name + " no coincide con el esquema esperado.");
  }
  const missing = modalityDeadlineFields.filter((field) => !current.fields.some((saved) => saved.name === field.name));
  if (apply && missing.length) {
    await pb.collections.import([{ ...current, fields: [...current.fields, ...missing] } as CollectionModel], false);
    const after = await pb.collections.getOne(current.id);
    if (modalityDeadlineFields.some((field) => !after.fields.some((saved) => saved.name === field.name && saved.type === field.type))) throw new Error("No se confirmó la migración de plazos.");
  }
  return { aplicado: apply, coleccion: current.name, camposAgregados: missing.map((field) => field.name), requiereActualizarRegistros: false };
}
async function main() {
  loadEnvConfig(process.cwd());
  const pb = new PocketBase(process.env.POCKETBASE_URL); pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_ADMIN_PASSWORD!);
  console.log(JSON.stringify(await migrateModalityDeadlines(pb, process.argv.includes("--apply")), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
