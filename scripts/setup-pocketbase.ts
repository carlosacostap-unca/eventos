import { pathToFileURL } from "node:url";

import { loadEnvConfig } from "@next/env";
import PocketBase, { ClientResponseError } from "pocketbase";

import { migrateSpeakerLinks } from "../lib/pocketbase/migrate-speaker-links";
import { pocketBaseSchema } from "../lib/pocketbase/schema";
import { deriveServiceCredentials } from "../lib/pocketbase/service-credentials";

loadEnvConfig(process.cwd());

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Falta la variable " + name);
  return value;
}

async function ensureAuthRecord(
  pb: PocketBase,
  collection: "administradores" | "cuentas_servicio",
  input: {
    email: string;
    password: string;
    nombre: string;
    role: "admin" | "service";
  },
) {
  try {
    const existing = await pb
      .collection(collection)
      .getFirstListItem(pb.filter("email = {:email}", input));
    await pb.collection(collection).update(existing.id, {
      nombre: input.nombre,
      role: input.role,
      password: input.password,
      passwordConfirm: input.password,
      verified: true,
    });
  } catch (error) {
    if (!(error instanceof ClientResponseError) || error.status !== 404) throw error;
    await pb.collection(collection).create({
      ...input,
      passwordConfirm: input.password,
      verified: true,
      emailVisibility: false,
    });
  }
}

export async function applyPocketBaseSchema(pb: PocketBase) {
  await pb.collections.import(pocketBaseSchema, false);
}

async function main() {
  const url = required("POCKETBASE_URL");
  const email = required("POCKETBASE_ADMIN_EMAIL");
  const password = required("POCKETBASE_ADMIN_PASSWORD");
  const pb = new PocketBase(url);
  pb.autoCancellation(false);

  await pb.collection("_superusers").authWithPassword(email, password);
  await applyPocketBaseSchema(pb);
  const migrated = await migrateSpeakerLinks(pb);

  const service = deriveServiceCredentials({
    url,
    adminEmail: email,
    adminPassword: password,
  });
  await ensureAuthRecord(pb, "cuentas_servicio", {
    email: service.email,
    password: service.password,
    nombre: "Next.js",
    role: "service",
  });
  await ensureAuthRecord(pb, "administradores", {
    email,
    password: service.administratorPassword,
    nombre: email.split("@")[0] || "Administrador",
    role: "admin",
  });

  console.log(`Esquema y accesos actualizados; vinculaciones de disertantes migradas: ${migrated}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo aplicar el esquema",
    );
    process.exitCode = 1;
  });
}
