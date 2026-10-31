import { readFile } from "node:fs/promises";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("node:fs/promises", async () => {
  const original = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return { ...original, readFile: vi.fn(original.readFile) };
});

import { GET } from "./route";

const request = (path: string[]) => GET(
  new Request("https://example.com/admin/documentacion/" + path.join("/")),
  { params: Promise.resolve({ path }) },
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ adminId: "admin" });
});

it.each([
  ["procesos"], ["procesos", "index.html"], ["procesos", "visor.js"],
  ["procesos", "vendor", "bpmn-viewer.min.js"], ["procesos", "bpmn", "inscripcion.bpmn"],
  ["arquitectura", "eventos.html"],
])("exige autorización administrativa antes de leer %j", async (...path) => {
  const denied = new Error("Acceso denegado por requireAdmin");
  mocks.requireAdmin.mockRejectedValue(denied);
  await expect(request(path)).rejects.toBe(denied);
  expect(readFile).not.toHaveBeenCalled();
});

it("redirige a un documento canónico para resolver correctamente sus archivos relativos", async () => {
  const response = await request(["procesos"]);
  expect(response.status).toBe(307);
  expect(response.headers.get("Location")).toBe("https://example.com/admin/documentacion/procesos/index.html");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(readFile).not.toHaveBeenCalled();
});

it("sirve el visor integrado y todos sus scripts y estilos con permiso y tipos correctos", async () => {
  const response = await request(["procesos", "index.html"]);
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain('href="/admin">← Volver al panel');
  expect(html).toContain("Documentación del sistema");
  expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
  const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
  expect(scripts).toHaveLength(3);
  expect(styles).toHaveLength(3);
  for (const name of [...scripts, ...styles]) {
    const asset = await request(["procesos", ...name.split("/")]);
    expect(asset.status, name).toBe(200);
    expect(asset.headers.get("Content-Type")).toContain(name.endsWith(".js") ? "text/javascript" : "text/css");
    expect(asset.headers.get("Cache-Control")).toContain("no-store");
    expect(asset.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect((await asset.text()).length).toBeGreaterThan(0);
  }
  expect(mocks.requireAdmin).toHaveBeenCalledTimes(7);
});

it("sirve los ocho modelos BPMN y la arquitectura enlazada", async () => {
  for (const name of ["preparacion", "inscripcion", "correcciones", "acreditacion", "presentaciones", "certificados", "consulta", "reportes"]) {
    const response = await request(["procesos", "bpmn", name + ".bpmn"]);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(await response.text()).toContain('isExecutable="false"');
  }
  const architecture = await request(["arquitectura", "eventos.html"]);
  expect(architecture.status).toBe(200);
  expect(architecture.headers.get("Content-Type")).toContain("text/html");
});

it.each([
  ["procesos", "..", "..", ".env.local"], ["procesos", "generar.mjs"],
  ["procesos", "vendor\\..\\..\\..\\.env.local"], ["procesos", "bpmn", "..", "modelos.mjs"],
  ["arquitectura", "archivo-desconocido.html"],
])("rechaza rutas no publicadas sin acceder al disco: %j", async (...path) => {
  expect((await request(path)).status).toBe(404);
  expect(readFile).not.toHaveBeenCalled();
});

it("devuelve un error seguro si un archivo no está disponible en el despliegue", async () => {
  vi.mocked(readFile).mockRejectedValueOnce(new Error("ENOENT: /ruta/interna"));
  const response = await request(["procesos", "index.html"]);
  expect(response.status).toBe(404);
  expect(await response.text()).toBe("Documento no disponible");
});
