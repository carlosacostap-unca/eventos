import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import PocketBase, { ClientResponseError } from "pocketbase";

export const readableCollections = [
  "administradores",
  "eventos",
  "inscripciones",
  "auditoria",
  "certificados",
  "envios_certificados",
] as const;

export const writableCollections = [
  "eventos",
  "inscripciones",
  "certificados",
  "envios_certificados",
] as const;

const readableCollectionSet = new Set<string>(readableCollections);
const writableCollectionSet = new Set<string>(writableCollections);
const sensitiveKey = /(?:authorization|cookie|password|secret|token)/i;
const protectedWriteKeys = new Set([
  "id",
  "collectionId",
  "collectionName",
  "created",
  "updated",
  "expand",
  "password",
  "passwordConfirm",
  "token",
]);

let envLoaded = false;

function loadProjectEnvironment() {
  if (envLoaded) return;

  try {
    loadEnvFile(resolve(process.cwd(), ".env.local"));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }

  envLoaded = true;
}

function requiredEnvironment(name: string): string {
  loadProjectEnvironment();
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta ${name} en .env.local.`);
  }
  return value;
}

export function assertReadableCollection(collection: string) {
  if (!readableCollectionSet.has(collection)) {
    throw new Error(
      `La colección ${collection} no está habilitada para lectura desde este MCP.`,
    );
  }
}

export function assertWritableCollection(collection: string) {
  if (!writableCollectionSet.has(collection)) {
    throw new Error(
      `La colección ${collection} no está habilitada para escritura desde este MCP.`,
    );
  }
}

export function assertSafeWriteData(data: Record<string, unknown>) {
  const rejected = Object.keys(data).filter(
    (key) => protectedWriteKeys.has(key) || sensitiveKey.test(key),
  );
  if (rejected.length > 0) {
    throw new Error(
      `No se permite escribir campos protegidos: ${rejected.join(", ")}.`,
    );
  }
}

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nested]) =>
      sensitiveKey.test(key) ? [] : [[key, redactSensitive(nested)]],
    ),
  );
}

function safePocketBaseError(error: unknown): Record<string, unknown> {
  if (error instanceof ClientResponseError) {
    return {
      error: "PocketBase rechazó la operación.",
      status: error.status,
      details: redactSensitive(error.response),
    };
  }

  return {
    error: error instanceof Error ? error.message : "Error desconocido.",
  };
}

export async function withSafeResult<T>(operation: () => Promise<T>) {
  try {
    return { ok: true as const, data: redactSensitive(await operation()) };
  } catch (error) {
    return { ok: false as const, ...safePocketBaseError(error) };
  }
}

export function createPocketBaseClient() {
  const pb = new PocketBase(requiredEnvironment("POCKETBASE_URL"));
  pb.autoCancellation(false);
  return pb;
}

export async function createAuthenticatedPocketBaseClient() {
  const pb = createPocketBaseClient();
  await pb.collection("_superusers").authWithPassword(
    requiredEnvironment("POCKETBASE_ADMIN_EMAIL"),
    requiredEnvironment("POCKETBASE_ADMIN_PASSWORD"),
  );
  return pb;
}

export async function checkPocketBaseHealth() {
  const pb = createPocketBaseClient();
  return pb.health.check();
}

export async function listProjectCollections() {
  const pb = await createAuthenticatedPocketBaseClient();
  const collections = await pb.collections.getFullList({ sort: "name" });

  return collections
    .filter((collection) => readableCollectionSet.has(collection.name))
    .map((collection) => ({
      id: collection.id,
      name: collection.name,
      type: collection.type,
      system: collection.system,
    }));
}

export async function describeProjectCollection(collection: string) {
  assertReadableCollection(collection);
  const pb = await createAuthenticatedPocketBaseClient();
  const definition = await pb.collections.getOne(collection);

  return {
    id: definition.id,
    name: definition.name,
    type: definition.type,
    system: definition.system,
    fields: definition.fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required,
      hidden: field.hidden,
      system: field.system,
    })),
    indexes: definition.indexes,
  };
}

export async function listProjectRecords(input: {
  collection: string;
  page: number;
  perPage: number;
  filter?: string;
  sort?: string;
  fields?: string;
  expand?: string;
}) {
  assertReadableCollection(input.collection);
  const pb = await createAuthenticatedPocketBaseClient();
  return pb.collection(input.collection).getList(input.page, input.perPage, {
    filter: input.filter,
    sort: input.sort,
    fields: input.fields,
    expand: input.expand,
    skipTotal: false,
  });
}

export async function getProjectRecord(collection: string, id: string) {
  assertReadableCollection(collection);
  const pb = await createAuthenticatedPocketBaseClient();
  return pb.collection(collection).getOne(id);
}

export async function createProjectRecord(
  collection: string,
  data: Record<string, unknown>,
) {
  assertWritableCollection(collection);
  assertSafeWriteData(data);
  const pb = await createAuthenticatedPocketBaseClient();
  return pb.collection(collection).create(data);
}

export async function updateProjectRecord(
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  assertWritableCollection(collection);
  assertSafeWriteData(data);
  const pb = await createAuthenticatedPocketBaseClient();
  return pb.collection(collection).update(id, data);
}

export async function deleteProjectRecord(collection: string, id: string) {
  assertWritableCollection(collection);
  const pb = await createAuthenticatedPocketBaseClient();
  await pb.collection(collection).delete(id);
  return { collection, id, deleted: true };
}
