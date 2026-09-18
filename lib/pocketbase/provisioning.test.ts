import type PocketBase from "pocketbase";
import { describe, expect, it, vi } from "vitest";

import { pocketBaseSchema } from "@/lib/pocketbase/schema";
import { applyPocketBaseSchema } from "../../scripts/setup-pocketbase";

describe("aprovisionamiento PocketBase", () => {
  it("puede aplicar el manifiesto dos veces sin borrar colecciones ni duplicarlas", async () => {
    const collections = new Map<string, unknown>();
    const importSchema = vi.fn(async (schema: typeof pocketBaseSchema, deleteMissing: boolean) => {
      expect(deleteMissing).toBe(false);
      for (const collection of schema) collections.set(collection.name, collection);
    });
    const pb = {
      collections: { import: importSchema },
    } as unknown as PocketBase;

    await applyPocketBaseSchema(pb);
    await applyPocketBaseSchema(pb);

    expect(importSchema).toHaveBeenCalledTimes(2);
    expect(collections.size).toBe(pocketBaseSchema.length);
    expect([...collections.keys()]).toContain("inscripciones");
  });
});
