import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import PocketBase, { type CollectionModel } from "pocketbase";
import { presentationFields } from "../lib/pocketbase/presentations-schema";

export async function migratePresentations(pb: PocketBase, apply = false) {
  const current = await pb.collections.getOne("exposiciones");
  if (!["evento", "modalidad", "responsable"].every((name) => current.fields.some((field) => field.name === name && field.type === "relation"))) throw new Error("Primero prepará el esquema de modalidades y exposiciones.");
  const missing = presentationFields.filter((field) => !current.fields.some((saved) => saved.name === field.name));
  for (const expected of presentationFields) {
    const saved = current.fields.find((field) => field.name === expected.name);
    if (saved && (saved.type !== expected.type || (expected.type === "file" && (!saved.protected || saved.maxSelect !== 1 || saved.maxSize !== expected.maxSize)))) throw new Error("Revisá el campo existente " + expected.name + ": no coincide con el esquema esperado.");
  }
  if (apply && missing.length) {
    await pb.collections.import([{ ...current, fields: [...current.fields, ...missing] } as CollectionModel], false);
    const after = await pb.collections.getOne("exposiciones");
    if (presentationFields.some((field) => !after.fields.some((saved) => saved.name === field.name && saved.type === field.type))) throw new Error("No se confirmó la migración de presentaciones.");
  }
  return { aplicado: apply, coleccion: "exposiciones", camposAgregados: missing.map((field) => field.name), requiereActualizarRegistros: false };
}
async function main() {
  loadEnvConfig(process.cwd());
  const pb = new PocketBase(process.env.POCKETBASE_URL); pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_ADMIN_PASSWORD!);
  console.log(JSON.stringify(await migratePresentations(pb, process.argv.includes("--apply")), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
