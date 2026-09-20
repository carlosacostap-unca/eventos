import { loadEnvConfig } from "@next/env";
import PocketBase from "pocketbase";

import { migrateSpeakerLinks } from "../lib/pocketbase/migrate-speaker-links";
import { pocketBaseSchema } from "../lib/pocketbase/schema";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.POCKETBASE_URL?.trim();
  const email = process.env.POCKETBASE_ADMIN_EMAIL?.trim();
  const password = process.env.POCKETBASE_ADMIN_PASSWORD?.trim();
  if (!url || !email || !password) {
    throw new Error("Faltan credenciales POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL o POCKETBASE_ADMIN_PASSWORD.");
  }

  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(email, password);
  await pb.collections.import(pocketBaseSchema, false);
  const migrated = await migrateSpeakerLinks(pb);
  console.log(`Esquema actualizado; vinculaciones de disertantes migradas: ${migrated}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo importar el esquema.");
  process.exitCode = 1;
});
