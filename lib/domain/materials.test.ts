import { expect, it } from "vitest";
import { MATERIAL_MAX_BYTES, materialFileError } from "./materials";

it.each(["diapositivas.pptx", "guía.pdf", "foto.PNG", "documento.odt"])("acepta %s", (name) => {
  expect(materialFileError(new File(["contenido"], name))).toBeNull();
});
it("rechaza archivos vacíos, no permitidos y demasiado grandes", () => {
  expect(materialFileError(new File([], "vacío.pdf"))).toContain("vacío");
  expect(materialFileError(new File(["script"], "script.html"))).not.toBeNull();
  expect(materialFileError({ name: "grande.pdf", size: MATERIAL_MAX_BYTES + 1 } as File)).toContain("25 MB");
});
