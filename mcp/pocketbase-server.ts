import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod/v4";

import {
  checkPocketBaseHealth,
  createProjectRecord,
  deleteProjectRecord,
  describeProjectCollection,
  getProjectRecord,
  listProjectCollections,
  listProjectRecords,
  readableCollections,
  updateProjectRecord,
  withSafeResult,
  writableCollections,
} from "./pocketbase-core";

const readableCollection = z.enum(readableCollections);
const writableCollection = z.enum(writableCollections);
const recordId = z.string().trim().min(1).max(64);
const recordData = z.record(z.string(), z.unknown());

function toolResult(result: Awaited<ReturnType<typeof withSafeResult>>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result,
    isError: !result.ok,
  };
}

export function createPocketBaseMcpServer() {
  const server = new McpServer(
    {
      name: "eventos-pocketbase",
      version: "1.0.0",
    },
    {
      instructions:
        "Trabajá sólo con las colecciones habilitadas de Eventos UNCA. Consultá el esquema antes de escribir, no intentes administrar credenciales y pedí aprobación antes de crear, actualizar o eliminar registros.",
    },
  );

  server.registerTool(
    "pocketbase_health",
    {
      title: "Comprobar PocketBase",
      description:
        "Comprueba que la instancia configurada en .env.local esté accesible. No requiere autenticación administrativa.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => toolResult(await withSafeResult(checkPocketBaseHealth)),
  );

  server.registerTool(
    "pocketbase_list_collections",
    {
      title: "Listar colecciones del proyecto",
      description:
        "Lista únicamente las colecciones de la aplicación habilitadas para este MCP.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => toolResult(await withSafeResult(listProjectCollections)),
  );

  server.registerTool(
    "pocketbase_describe_collection",
    {
      title: "Describir colección",
      description:
        "Devuelve campos e índices de una colección de la aplicación.",
      inputSchema: z.object({ collection: readableCollection }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ collection }) =>
      toolResult(
        await withSafeResult(() => describeProjectCollection(collection)),
      ),
  );

  server.registerTool(
    "pocketbase_list_records",
    {
      title: "Listar registros",
      description:
        "Consulta registros paginados de una colección permitida. Limita cada respuesta a 100 elementos.",
      inputSchema: z.object({
        collection: readableCollection,
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(30),
        filter: z.string().max(500).optional(),
        sort: z.string().max(200).optional(),
        fields: z.string().max(500).optional(),
        expand: z.string().max(300).optional(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) =>
      toolResult(await withSafeResult(() => listProjectRecords(input))),
  );

  server.registerTool(
    "pocketbase_get_record",
    {
      title: "Obtener registro",
      description: "Obtiene un registro por colección e identificador.",
      inputSchema: z.object({ collection: readableCollection, id: recordId }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ collection, id }) =>
      toolResult(
        await withSafeResult(() => getProjectRecord(collection, id)),
      ),
  );

  server.registerTool(
    "pocketbase_create_record",
    {
      title: "Crear registro",
      description:
        "Crea un registro en una colección habilitada para escritura. No admite campos de credenciales ni campos internos.",
      inputSchema: z.object({ collection: writableCollection, data: recordData }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ collection, data }) =>
      toolResult(
        await withSafeResult(() => createProjectRecord(collection, data)),
      ),
  );

  server.registerTool(
    "pocketbase_update_record",
    {
      title: "Actualizar registro",
      description:
        "Actualiza un registro en una colección habilitada para escritura. No admite campos de credenciales ni campos internos.",
      inputSchema: z.object({
        collection: writableCollection,
        id: recordId,
        data: recordData,
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ collection, id, data }) =>
      toolResult(
        await withSafeResult(() => updateProjectRecord(collection, id, data)),
      ),
  );

  server.registerTool(
    "pocketbase_delete_record",
    {
      title: "Eliminar registro",
      description:
        "Elimina de forma permanente un registro. Requiere confirm=true además de la aprobación del cliente MCP.",
      inputSchema: z.object({
        collection: writableCollection,
        id: recordId,
        confirm: z.literal(true),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ collection, id }) =>
      toolResult(
        await withSafeResult(() => deleteProjectRecord(collection, id)),
      ),
  );

  return server;
}

serveStdio(createPocketBaseMcpServer, {
  onerror: (error) => console.error("MCP PocketBase:", error.message),
});
