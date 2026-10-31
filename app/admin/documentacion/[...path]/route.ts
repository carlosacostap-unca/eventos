import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assets = new Map<string, string>([
  ...[
    "index.html", "visor.css", "visor.js", "procesos.js", "README.md", "manifest.json",
    "vendor/bpmn-viewer.min.js", "vendor/diagram-js.css", "vendor/bpmn-js.css",
    "vendor/LICENSE.bpmn-js", "vendor/manifest.json",
    ...["preparacion", "inscripcion", "correcciones", "acreditacion", "presentaciones", "certificados", "consulta", "reportes"].map(name => "bpmn/" + name + ".bpmn"),
  ].map(name => ["procesos/" + name, "ingenieria-procesos/" + name] as [string, string]),
  ["arquitectura/eventos.html", "arquitectura/eventos.html"],
]);

const contentTypes: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  bpmn: "application/xml; charset=utf-8",
};

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  await requireAdmin();
  const { path } = await params;
  if (path.length === 1 && path[0] === "procesos") {
    return new Response(null, {
      status: 307,
      headers: { ...privateHeaders, Location: new URL("/admin/documentacion/procesos/index.html", request.url).href },
    });
  }

  // La URL solo selecciona entradas de esta lista; nunca una ruta de disco libre.
  const file = assets.get(path.join("/"));
  if (!file) return new Response("Documento no encontrado", { status: 404, headers: privateHeaders });

  let bytes: Buffer;
  try {
    bytes = await readFile(join(process.cwd(), "docs", file));
  } catch {
    return new Response("Documento no disponible", { status: 404, headers: privateHeaders });
  }
  const body = file === "ingenieria-procesos/index.html"
    ? bytes.toString("utf8")
      .replace('<div class="sidebar-footer">', '<div class="sidebar-footer"><a href="/admin">← Volver al panel</a>')
      .replace("Consulta local", "Documentación del sistema")
    : new Uint8Array(bytes);

  return new Response(body, {
    headers: {
      ...privateHeaders,
      "Content-Type": contentTypes[file.split(".").pop()!] ?? "text/plain; charset=utf-8",
    },
  });
}
