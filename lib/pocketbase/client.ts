import "server-only";

import type PocketBase from "pocketbase";

import { getServerEnv } from "@/lib/env";
import { createPocketBaseClient } from "@/lib/pocketbase/factory";
import { deriveServiceCredentials } from "@/lib/pocketbase/service-credentials";

export async function createServicePocketBase(): Promise<PocketBase> {
  const env = getServerEnv();
  const client = createPocketBaseClient(env.POCKETBASE_URL);
  const credentials = deriveServiceCredentials({
    url: env.POCKETBASE_URL,
    adminEmail: env.POCKETBASE_ADMIN_EMAIL,
    adminPassword: env.POCKETBASE_ADMIN_PASSWORD,
  });
  await client
    .collection("cuentas_servicio")
    .authWithPassword(credentials.email, credentials.password);
  return client;
}
