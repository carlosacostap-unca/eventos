import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import PocketBase, { ClientResponseError } from "pocketbase";
import { loadEnvConfig } from "@next/env";
import { deriveServiceCredentials } from "../lib/pocketbase/service-credentials";

export async function checkModalityBatch(pb: PocketBase) {
  const key = "prueba-rollback:" + randomUUID();
  const batch = pb.createBatch();
  batch.collection("bloqueos_operacion").create({ clave: key, propietario: "prueba", vence: new Date(Date.now() + 60000).toISOString() });
  batch.collection("bloqueos_operacion").create({ propietario: "invalido-sin-clave" });
  let failed = false;
  try { await batch.send(); }
  catch (e) {
    if (!(e instanceof ClientResponseError) || e.status !== 400 || !e.response?.data?.requests) throw new Error("El servidor no confirmó soporte de batches transaccionales con la cuenta de servicio.");
    failed = true;
  }
  const records = await pb.collection("bloqueos_operacion").getFullList({ filter: pb.filter("clave = {:key}", { key }) });
  if (!failed || records.length) throw new Error("La comprobación de rollback falló; no habilites inscripciones grupales.");
  return { batch: "habilitado", rollback: "verificado", registrosPersistidos: 0 };
}
async function main() {
  loadEnvConfig(process.cwd());
  if (!process.argv.includes("--probe")) { console.log("Usá --probe para ejecutar una transacción de prueba que debe revertirse íntegramente."); return; }
  const pb = new PocketBase(process.env.POCKETBASE_URL);
  const credentials = deriveServiceCredentials({ url: process.env.POCKETBASE_URL!, adminEmail: process.env.POCKETBASE_ADMIN_EMAIL!, adminPassword: process.env.POCKETBASE_ADMIN_PASSWORD! });
  await pb.collection("cuentas_servicio").authWithPassword(credentials.email, credentials.password);
  console.log(JSON.stringify(await checkModalityBatch(pb)));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
