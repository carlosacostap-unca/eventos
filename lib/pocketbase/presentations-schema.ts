import { PRESENTATION_MAX_BYTES } from "../domain/presentations";

export const presentationFields = [
  { name: "presentacion_final", type: "file", maxSelect: 1, maxSize: PRESENTATION_MAX_BYTES, protected: true, mimeTypes: ["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip", "application/octet-stream"] },
  { name: "presentacion_nombre", type: "text", max: 200 },
  { name: "presentacion_tamano", type: "number", min: 0, max: PRESENTATION_MAX_BYTES, onlyInt: true },
  { name: "presentacion_formato", type: "select", maxSelect: 1, values: ["pdf", "ppt", "pptx"] },
  { name: "presentacion_actualizada", type: "date" },
  { name: "presentacion_huella", type: "text", max: 64 },
];
