import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import PocketBase, { type CollectionModel } from "pocketbase";
import { multipleExhibitionIndexes } from "../lib/pocketbase/multiple-exhibitions-schema";

export async function migrateMultipleExhibitions(pb: PocketBase, apply = false) {
  const names = ["exposiciones", "certificados"] as const;
  const collections = await Promise.all(names.map((name) => pb.collections.getOne(name)));
  const changes: CollectionModel[] = [];
  for (const [index, current] of collections.entries()) {
    const name = names[index];
    if (name === "exposiciones" && !["evento", "responsable"].every((field) => current.fields.some((f) => f.name === field && f.type === "relation"))) throw new Error("El esquema de exposiciones no coincide con el esperado.");
    if (name === "certificados" && !["inscripcion", "exposicion"].every((field) => current.fields.some((f) => f.name === field && f.type === "relation"))) throw new Error("Primero debe estar preparada la base para modalidades y exposiciones.");
    const indexes = multipleExhibitionIndexes(name, current.indexes ?? []);
    if (JSON.stringify(indexes) !== JSON.stringify(current.indexes ?? [])) changes.push({ ...current, indexes });
  }
  if (apply && changes.length) {
    // La importación conserva campos, reglas, archivos y registros existentes.
    await pb.collections.import(changes, false);
    for (const name of names) {
      const after = await pb.collections.getOne(name);
      if (JSON.stringify(multipleExhibitionIndexes(name, after.indexes ?? [])) !== JSON.stringify(after.indexes ?? [])) throw new Error("No se confirmó la migración de índices de " + name + ".");
    }
  }
  return { aplicado: apply, coleccionesActualizadas: changes.map((collection) => collection.name), requiereActualizarRegistros: false };
}

async function main() {
  loadEnvConfig(process.cwd());
  const pb = new PocketBase(process.env.POCKETBASE_URL); pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_ADMIN_PASSWORD!);
  console.log(JSON.stringify(await migrateMultipleExhibitions(pb, process.argv.includes("--apply")), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
