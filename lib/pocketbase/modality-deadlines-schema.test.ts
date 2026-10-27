import { expect, it, vi } from "vitest";
import type PocketBase from "pocketbase";
import { migrateModalityDeadlines } from "@/scripts/migrate-modality-deadlines";
import { pocketBaseSchema } from "./schema";

it("declara ambos plazos como fechas opcionales independientes", () => {
  const fields = pocketBaseSchema.find((collection) => collection.name === "modalidades_inscripcion")!.fields;
  for (const name of ["inscripcion_hasta", "presentaciones_hasta"]) {
    expect(fields.find((field) => field.name === name)).toMatchObject({ type: "date" });
    expect(fields.find((field) => field.name === name)?.required).not.toBe(true);
  }
});
it("la migración agrega únicamente los plazos, conserva reglas e índices y es reejecutable", async () => {
  let current = { id: "modes", name: "modalidades_inscripcion", fields: [{ name: "evento", type: "relation" }, { name: "codigo", type: "text" }], indexes: ["anterior"], viewRule: "regla" };
  const update = vi.fn(async (collections) => { current = collections[0]; });
  const pb = { collections: { getOne: async () => current, import: update } } as unknown as PocketBase;
  expect((await migrateModalityDeadlines(pb)).camposAgregados).toEqual(["inscripcion_hasta", "presentaciones_hasta"]);
  expect(update).not.toHaveBeenCalled();
  await migrateModalityDeadlines(pb, true);
  expect(update.mock.calls[0][0][0]).toMatchObject({ indexes: ["anterior"], viewRule: "regla" });
  expect((await migrateModalityDeadlines(pb, true)).camposAgregados).toEqual([]);
  expect(update).toHaveBeenCalledTimes(1);
});
