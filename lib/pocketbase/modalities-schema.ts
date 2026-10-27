import type { CollectionModel } from "pocketbase";
import { EXHIBITION_OWNER_INDEX } from "./multiple-exhibitions-schema";
import { presentationFields } from "./presentations-schema";
import { modalityDeadlineFields } from "./modality-deadlines-schema";

export const MODALITY_IDS = { modalidades: "evmodal00000001", versiones: "evversi00000001", exposiciones: "evexpos00000001", integrantes: "evinteg00000001", operaciones: "evopera00000001", destinatarios: "evdesti00000001", bloqueos: "evlocks00000001" };
const rule = '@request.auth.id != "" && (@request.auth.role = "admin" || @request.auth.role = "service")';
const relation = (name: string, collectionId: string, required = true, cascadeDelete = false) => ({ name, type: "relation", collectionId, required, maxSelect: 1, cascadeDelete });
const text = (name: string, max = 160, required = false) => ({ name, type: "text", max, required });
export const registrationModalityFields = [
  relation("modalidad", MODALITY_IDS.modalidades, false), relation("version_formulario", MODALITY_IDS.versiones, false),
  { name: "tipo_alta", type: "select", maxSelect: 1, values: ["principal", "vinculada"] },
  { name: "respuestas", type: "json", maxSize: 100000 },
];
export const certificateModalityFields = [relation("modalidad", MODALITY_IDS.modalidades, false), relation("version_formulario", MODALITY_IDS.versiones, false), relation("exposicion", MODALITY_IDS.exposiciones, false, true), { name: "alcance", type: "select", maxSelect: 1, values: ["individual", "grupo"] }, text("huella", 64)];
export const modalityCollections = [
  { id: MODALITY_IDS.modalidades, name: "modalidades_inscripcion", fields: [relation("evento", "evevents0000001", true, true), text("codigo", 40, true), text("nombre", 160, true), { name: "orden", type: "number", min: 0, max: 1000, onlyInt: true }, { name: "habilitada", type: "bool" }, { name: "entrega", type: "bool" }, relation("version_publicada", MODALITY_IDS.versiones, false), { name: "plantilla_certificado", type: "file", maxSelect: 1, maxSize: 10485760, mimeTypes: ["application/pdf", "image/png", "image/jpeg"], protected: true }, { name: "textos_certificado", type: "json", maxSize: 10000 }, ...modalityDeadlineFields], indexes: ["CREATE UNIQUE INDEX idx_modalidad_codigo ON modalidades_inscripcion (evento,codigo)"] },
  { id: MODALITY_IDS.versiones, name: "versiones_modalidad", fields: [relation("modalidad", MODALITY_IDS.modalidades, true, true), { name: "numero", type: "number", min: 1, onlyInt: true, required: true }, { name: "esquema", type: "json", required: true, maxSize: 100000 }], indexes: ["CREATE UNIQUE INDEX idx_modalidad_version ON versiones_modalidad (modalidad,numero)"], updateRule: null, deleteRule: null },
  { id: MODALITY_IDS.exposiciones, name: "exposiciones", fields: [relation("evento", "evevents0000001", true, true), relation("modalidad", MODALITY_IDS.modalidades), relation("version", MODALITY_IDS.versiones), relation("responsable", "evregist0000001", true, true), { name: "respuestas", type: "json", maxSize: 100000 }, ...presentationFields], indexes: [EXHIBITION_OWNER_INDEX] },
  { id: MODALITY_IDS.integrantes, name: "integrantes_exposicion", fields: [relation("exposicion", MODALITY_IDS.exposiciones, true, true), relation("participante", "evregist0000001", true, true), text("funcion", 40, true), text("etiqueta", 160, true), { name: "orden", type: "number", onlyInt: true, min: 0 }, { name: "respuestas", type: "json", maxSize: 100000 }], indexes: ["CREATE UNIQUE INDEX idx_exposicion_integrante ON integrantes_exposicion (exposicion,participante)"] },
  { id: MODALITY_IDS.operaciones, name: "operaciones_inscripcion", fields: [relation("evento", "evevents0000001", true, true), text("clave", 80, true), text("huella", 64, true), relation("participante", "evregist0000001", true, true), relation("exposicion", MODALITY_IDS.exposiciones, false, true)], indexes: ["CREATE UNIQUE INDEX idx_operacion_clave ON operaciones_inscripcion (evento,clave)"] },
  { id: MODALITY_IDS.destinatarios, name: "destinatarios_certificado", fields: [relation("certificado", "evcerts0000001", true, true), relation("participante", "evregist0000001", true, true)], indexes: ["CREATE UNIQUE INDEX idx_certificado_destinatario ON destinatarios_certificado (certificado,participante)"] },
  { id: MODALITY_IDS.bloqueos, name: "bloqueos_operacion", fields: [text("clave", 100, true), text("propietario", 40, true), { name: "vence", type: "date", required: true }], indexes: ["CREATE UNIQUE INDEX idx_bloqueo_clave ON bloqueos_operacion (clave)"] },
].map((c) => ({ type: "base", listRule: rule, viewRule: rule, createRule: rule, updateRule: rule, deleteRule: rule, ...c })) as unknown as CollectionModel[];
