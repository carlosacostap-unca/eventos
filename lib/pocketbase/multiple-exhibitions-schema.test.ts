import type PocketBase from "pocketbase";
import { expect, it, vi } from "vitest";
import { pocketBaseSchema } from "./schema";
import { EXHIBITION_OWNER_INDEX, INDIVIDUAL_CERTIFICATE_INDEX, multipleExhibitionIndexes } from "./multiple-exhibitions-schema";
import { migrateMultipleExhibitions } from "@/scripts/migrate-multiple-exhibitions";

it("retira solo las restricciones anteriores y conserva los índices y campos ajenos", () => {
  const old = 'CREATE UNIQUE INDEX "old_owner" ON "exposiciones" ("evento", "responsable");';
  const extra = "CREATE INDEX custom_event ON exposiciones (evento)";
  expect(multipleExhibitionIndexes("exposiciones", [old, extra])).toEqual([extra, EXHIBITION_OWNER_INDEX]);
  const group = "CREATE UNIQUE INDEX idx_certificado_exposicion ON certificados (exposicion) WHERE exposicion != ''";
  expect(multipleExhibitionIndexes("certificados", ["CREATE UNIQUE INDEX old_person ON certificados (inscripcion)", group])).toEqual([group, INDIVIDUAL_CERTIFICATE_INDEX]);
  const formatted = "CREATE UNIQUE INDEX `idx_certificados_inscripcion` ON `certificados` (`inscripcion`) WHERE exposicion=''";
  expect(multipleExhibitionIndexes("certificados", [formatted, group])).toEqual([formatted, group]);
});

it("mantiene un DNI único por evento, un certificado por exposición y uno individual por persona", () => {
  expect(pocketBaseSchema.find((c) => c.name === "exposiciones")?.indexes).toContain(EXHIBITION_OWNER_INDEX);
  const indexes = pocketBaseSchema.find((c) => c.name === "certificados")?.indexes?.join(" ");
  expect(indexes).toContain(INDIVIDUAL_CERTIFICATE_INDEX);
  expect(indexes).toContain("UNIQUE INDEX idx_certificado_exposicion");
  expect(pocketBaseSchema.find((c) => c.name === "inscripciones")?.indexes?.join(" ")).toContain("UNIQUE INDEX idx_inscripciones_documento");
});

it("ofrece un plan sin escribir y una aplicación reejecutable que no toca registros", async () => {
  let collections = [
    { id: "groups", name: "exposiciones", fields: [{ name: "evento", type: "relation" }, { name: "responsable", type: "relation" }], indexes: ["CREATE UNIQUE INDEX idx_exposicion_responsable ON exposiciones (evento,responsable)"], listRule: "original" },
    { id: "certs", name: "certificados", fields: [{ name: "inscripcion", type: "relation" }, { name: "exposicion", type: "relation" }], indexes: ["CREATE UNIQUE INDEX idx_certificados_inscripcion ON certificados (inscripcion)"], listRule: "original" },
  ];
  const original = structuredClone(collections);
  const write = vi.fn(async (changes) => { collections = changes; });
  const recordAccess = vi.fn();
  const pb = { collections: { getOne: async (name: string) => structuredClone(collections.find((c) => c.name === name)), import: write }, collection: recordAccess } as unknown as PocketBase;
  expect(await migrateMultipleExhibitions(pb)).toMatchObject({ aplicado: false, coleccionesActualizadas: ["exposiciones", "certificados"], requiereActualizarRegistros: false });
  expect(write).not.toHaveBeenCalled();
  expect(await migrateMultipleExhibitions(pb, true)).toMatchObject({ aplicado: true });
  expect(write).toHaveBeenCalledTimes(1);
  expect(await migrateMultipleExhibitions(pb, true)).toMatchObject({ coleccionesActualizadas: [] });
  expect(write).toHaveBeenCalledTimes(1);
  expect(collections.map(({ fields, listRule }) => ({ fields, listRule }))).toEqual(original.map(({ fields, listRule }) => ({ fields, listRule })));
  expect(recordAccess).not.toHaveBeenCalled();
});
