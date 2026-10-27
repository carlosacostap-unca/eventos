import { expect, it, vi } from "vitest";
import type PocketBase from "pocketbase";
import { migratePresentations } from "@/scripts/migrate-presentations";
import { presentationFields } from "./presentations-schema";
import { pocketBaseSchema } from "./schema";

it("guarda un archivo protegido por trabajo sin hacer obligatoria la entrega", () => {
  const collection = pocketBaseSchema.find((c) => c.name === "exposiciones")!;
  expect(collection.fields.find((f) => f.name === "presentacion_final")).toMatchObject({ protected: true, maxSelect: 1, maxSize: 25 * 1024 * 1024 });
  expect(collection.fields.find((f) => f.name === "presentacion_final")?.required).not.toBe(true);
});
it("la migración agrega campos preservando reglas, índices, relaciones y otros campos", async () => {
  const fields = ["evento", "modalidad", "responsable"].map((name) => ({ name, type: "relation" }));
  let current = { name: "exposiciones", fields, indexes: ["indice anterior"], viewRule: "regla anterior" };
  const update = vi.fn(async (collections) => { current = collections[0]; });
  const pb = { collections: { getOne: async () => current, import: update } } as unknown as PocketBase;
  expect((await migratePresentations(pb)).camposAgregados).toHaveLength(presentationFields.length);
  expect(update).not.toHaveBeenCalled();
  await migratePresentations(pb, true);
  expect(update.mock.calls[0][0][0]).toMatchObject({ indexes: ["indice anterior"], viewRule: "regla anterior" });
  expect((await migratePresentations(pb, true)).camposAgregados).toEqual([]);
  expect(update).toHaveBeenCalledTimes(1);
});
