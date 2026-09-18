import { resolve } from "node:path";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const projectRoot = resolve(import.meta.dirname, "..");
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    resolve(projectRoot, "node_modules/tsx/dist/cli.mjs"),
    resolve(projectRoot, "mcp/pocketbase-server.ts"),
  ],
  cwd: projectRoot,
  stderr: "pipe",
});
const client = new Client({ name: "eventos-mcp-check", version: "1.0.0" });

async function main() {
  await client.connect(transport);

  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name);
  if (!names.includes("pocketbase_health")) {
    throw new Error("El servidor no publicó pocketbase_health.");
  }

  const health = await client.callTool({
    name: "pocketbase_health",
    arguments: {},
  });
  if (health.isError) {
    throw new Error("PocketBase no respondió al chequeo de salud.");
  }

  const collections = await client.callTool({
    name: "pocketbase_list_collections",
    arguments: {},
  });
  if (collections.isError) {
    throw new Error(
      "PocketBase está accesible, pero rechazó las credenciales administrativas de .env.local.",
    );
  }

  console.log(
    `MCP correcto: ${tools.length} herramientas; conexión administrativa verificada.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
  });
