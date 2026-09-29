import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import type PocketBase from "pocketbase";
import PocketBaseClient from "pocketbase";
import { pocketBaseSchema } from "../lib/pocketbase/schema";

export async function applyMaterialsSchema(pb: PocketBase) {
  const schema = pocketBaseSchema.find((collection) => collection.name === "materiales_evento");
  if (!schema) throw new Error("Falta el esquema de materiales.");
  await pb.collections.import([schema], false);
  const applied = await pb.collections.getOne("materiales_evento");
  const file = applied.fields.find((field) => field.name === "archivo");
  if (!file?.protected || applied.viewRule !== schema.viewRule) throw new Error("La protección de archivos no coincide con el esquema esperado.");
}

async function main() {
  loadEnvConfig(process.cwd());
  const { POCKETBASE_URL: url, POCKETBASE_ADMIN_EMAIL: email, POCKETBASE_ADMIN_PASSWORD: password } = process.env;
  if (!url || !email || !password) throw new Error("Faltan las variables de PocketBase.");
  const pb = new PocketBaseClient(url);
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(email, password);
  await applyMaterialsSchema(pb);
  console.log("Colección materiales_evento preparada; archivos protegidos y almacenamiento de PocketBase habilitado.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : "No se pudo preparar el storage de materiales."); process.exitCode = 1; });
}
