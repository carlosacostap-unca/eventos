import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import PocketBase, { type CollectionModel, type RecordModel } from "pocketbase";
import { pocketBaseSchema } from "../lib/pocketbase/schema";
import { modalityCollections, registrationModalityFields, certificateModalityFields } from "../lib/pocketbase/modalities-schema";
import { attendeeDefinition } from "../lib/domain/modalities";

// Usa las credenciales existentes solo para autenticar; no crea usuarios ni cambia claves.
export async function migrateModalities(pb: PocketBase, apply = false) {
  const batchSettings = (await pb.settings.getAll()).batch;
  if (!apply) {
    const counts = await Promise.all(["eventos", "inscripciones", "certificados"].map((name) => pb.collection(name).getList(1, 1, { fields: "id" })));
    return { eventos: counts[0].totalItems, inscripciones: counts[1].totalItems, certificados: counts[2].totalItems, aplicado: false, batchHabilitado: batchSettings.enabled, maxSolicitudesBatch: batchSettings.maxRequests };
  }
  if (!batchSettings.enabled || batchSettings.maxRequests < 100) throw new Error("Antes de migrar, habilitá batches transaccionales con al menos 100 solicitudes por batch en PocketBase.");
  const events = await pb.collection("eventos").getFullList();
  const registrations = await pb.collection("inscripciones").getFullList();
  const certificates = await pb.collection("certificados").getFullList();
  const report = { eventos: events.length, inscripciones: registrations.length, certificados: certificates.length, aplicado: apply };
  const existing = await pb.collections.getFullList();
  const desired = modalityCollections.map((collection) => pocketBaseSchema.find((c) => c.name === collection.name)!);
  for (const [name, fields] of [["inscripciones", registrationModalityFields], ["certificados", certificateModalityFields]] as const) {
    const current = existing.find((c) => c.name === name)!;
    const indexes = name === "certificados" ? [...new Set([...(current.indexes ?? []), "CREATE UNIQUE INDEX idx_certificado_exposicion ON certificados (exposicion) WHERE exposicion != ''"])] : current.indexes;
    desired.push({ ...current, fields: [...current.fields.map((f) => name === "certificados" && f.name === "archivo" ? { ...f, protected: true } : f), ...fields.filter((f) => !current.fields.some((old) => old.name === f.name))], indexes } as CollectionModel);
  }
  // Importar sin eliminar colecciones ajenas ni registros; admite referencias circulares.
  await pb.collections.import(desired, false);
  for (const event of events) {
    const modes = await pb.collection("modalidades_inscripcion").getFullList({ filter: pb.filter('evento = {:id} && codigo = "asistente"', { id: event.id }) });
    let mode = modes[0];
    if (!mode) {
      const data: Record<string, unknown> = { evento: event.id, codigo: "asistente", nombre: "Asistente", orden: 0, habilitada: true, entrega: event.certificado_asistencia !== "no", textos_certificado: event.textos_certificado || {} };
      if (event.plantilla_certificado) {
        const token = await pb.files.getToken();
        const response = await fetch(pb.files.getURL(event, event.plantilla_certificado, { token }));
        if (!response.ok) throw new Error("No se pudo preservar una plantilla; se puede reanudar la migración.");
        data.plantilla_certificado = new File([await response.arrayBuffer()], event.plantilla_certificado, { type: response.headers.get("content-type") ?? "application/pdf" });
      }
      mode = await pb.collection("modalidades_inscripcion").create(data);
    }
    if (!mode.version_publicada) {
      const versions = await pb.collection("versiones_modalidad").getFullList({ filter: pb.filter("modalidad = {:id}", { id: mode.id }) });
      const version = versions[0] ?? await pb.collection("versiones_modalidad").create({ modalidad: mode.id, numero: 1, esquema: attendeeDefinition });
      mode = await pb.collection("modalidades_inscripcion").update(mode.id, { version_publicada: version.id });
    }
    for (const registration of registrations.filter((r) => r.evento === event.id && !r.modalidad)) {
      await pb.collection("inscripciones").update(registration.id, { modalidad: mode.id, tipo_alta: "principal", version_formulario: mode.version_publicada, respuestas: {} });
    }
    for (const certificate of certificates.filter((c) => c.evento === event.id && !c.modalidad)) {
      await pb.collection("certificados").update(certificate.id, { modalidad: mode.id, alcance: "individual", version_formulario: mode.version_publicada });
    }
    // El checkpoint de destinatarios es independiente para poder reanudar tras un fallo.
    for (const certificate of certificates.filter((c) => c.evento === event.id && !c.exposicion)) await ensureRecipient(pb, certificate);
  }
  return report;
}
async function ensureRecipient(pb: PocketBase, certificate: RecordModel) {
  const rows = await pb.collection("destinatarios_certificado").getFullList({ filter: pb.filter("certificado = {:id} && participante = {:person}", { id: certificate.id, person: certificate.inscripcion }) });
  if (!rows.length) await pb.collection("destinatarios_certificado").create({ certificado: certificate.id, participante: certificate.inscripcion });
}
async function main() {
  loadEnvConfig(process.cwd());
  const pb = new PocketBase(process.env.POCKETBASE_URL);
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_ADMIN_PASSWORD!);
  console.log(JSON.stringify(await migrateModalities(pb, process.argv.includes("--apply")), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
