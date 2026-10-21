import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import PocketBase from "pocketbase";
import { pocketBaseSchema } from "../lib/pocketbase/schema";

export async function migratePublicEventPage(pb: PocketBase, apply = false) {
  const collection = await pb.collections.getOne("eventos");
  const existing = collection.fields.find(field => field.name === "pagina_publica");
  if (existing && existing.type !== "json") throw new Error("El campo pagina_publica existe con un tipo incompatible.");
  const events = await pb.collection("eventos").getList(1, 1, { fields: "id" });
  if (apply && !existing) {
    const field = pocketBaseSchema.find(c => c.name === "eventos")!.fields.find(f => f.name === "pagina_publica")!;
    await pb.collections.update(collection.id, { fields: [...collection.fields, field] });
    const updated = await pb.collections.getOne(collection.id);
    if (!updated.fields.some(f => f.name === "pagina_publica" && f.type === "json")) throw new Error("No se confirmó el nuevo campo de configuración.");
  }
  return { eventos: events.totalItems, campo: "pagina_publica", yaExistia: !!existing, aplicado: apply, requiereActualizarRegistros: false };
}

async function main() {
  loadEnvConfig(process.cwd());
  const pb = new PocketBase(process.env.POCKETBASE_URL); pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_ADMIN_PASSWORD!);
  console.log(JSON.stringify(await migratePublicEventPage(pb, process.argv.includes("--apply")), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
