import { describe, expect, it } from "vitest";

import { speakerInputSchema } from "@/lib/domain/models";
import { validateSpeakerPhoto } from "@/lib/domain/speakers";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

describe("disertantes", () => {
  it("requiere título, nombre y universidad", () => {
    expect(speakerInputSchema.safeParse({
      titulo: "Dra.",
      nombre: "Ana Pérez",
      universidades: "Universidad Nacional de Catamarca",
    }).success).toBe(true);
    expect(speakerInputSchema.safeParse({
      titulo: "",
      nombre: "Ana Pérez",
      universidades: "",
    }).success).toBe(false);
  });

  it("acepta una foto real y rechaza contenido disfrazado", async () => {
    const valid = new File([png], "foto.png", { type: "image/png" });
    const invalid = new File(["texto"], "foto.png", { type: "image/png" });
    expect((await validateSpeakerPhoto(valid, true)).photo).toBe(valid);
    expect((await validateSpeakerPhoto(invalid, true)).error).toBeTruthy();
    expect((await validateSpeakerPhoto(null, true)).error).toBeTruthy();
    expect((await validateSpeakerPhoto(null, false)).error).toBeUndefined();
  });
});
