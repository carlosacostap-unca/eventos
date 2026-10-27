import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { preparePresentation } from "./presentation-files";
import { PRESENTATION_MAX_BYTES, presentationFileError } from "@/lib/domain/presentations";

it.each(["pdf", "ppt", "pptx"])("acepta el formato %s y asigna metadata y huella del contenido", async (format) => {
  const content = format === "pdf" ? Buffer.from("%PDF-1.7\ncontenido") : format === "ppt" ? Buffer.concat([Buffer.from("d0cf11e0a1b11ae1", "hex"), Buffer.from("PowerPoint Document", "utf16le")]) : Buffer.from("PK\x03\x04[Content_Types].xml ppt/presentation.xml");
  const result = await preparePresentation(new File([content], "trabajo." + format, { type: "application/octet-stream" }));
  expect(result.data).toMatchObject({ presentacion_nombre: "trabajo." + format, presentacion_tamano: content.length, presentacion_formato: format, presentacion_huella: expect.stringMatching(/^[a-f0-9]{64}$/) });
  expect(Buffer.from(await result.file.arrayBuffer())).toEqual(content);
});
it.each(["pdf", "ppt", "pptx"])("rechaza contenido incompatible aunque la extensión sea %s", async (format) => {
  await expect(preparePresentation(new File(["<html>falso</html>"], "trabajo." + format))).rejects.toMatchObject({ code: "INVALID" });
});
it.each(["trabajo.exe", "trabajo.pptm", "../trabajo.pdf", "bad\nname.pdf"])("rechaza nombre o extensión no permitida: %j", (name) => {
  expect(presentationFileError({ name, size: 100 })).toBeTruthy();
});
it("rechaza archivos vacíos y mayores al límite antes de leerlos", async () => {
  expect(presentationFileError({ name: "a.pdf", size: 0 })).toBeTruthy();
  expect(presentationFileError({ name: "a.pdf", size: PRESENTATION_MAX_BYTES + 1 })).toContain("25 MB");
  expect(presentationFileError({ name: "a.PDF", size: PRESENTATION_MAX_BYTES })).toBeNull();
});
