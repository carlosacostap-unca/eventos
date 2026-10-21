import "server-only";
import { ClientResponseError, type RecordModel } from "pocketbase";
import { z } from "zod";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { attendeeDefinition, formSchema, type FormVersion, type Modality, type PublicModality } from "@/lib/domain/modalities";
import { recordId } from "@/lib/domain/fingerprints";
import { DomainError } from "@/lib/domain/errors";
import type { EventRecord } from "@/lib/domain/models";
import { certificateTextInputSchema } from "@/lib/domain/certificate-texts";
import { validateCertificateTemplate } from "@/lib/certificates/pdf";
import { audit } from "./audit";
import { withOperationLock } from "./operation-lock";

export async function listModalities(eventId: string): Promise<Modality[]> {
  const pb = await createServicePocketBase();
  try { return await pb.collection("modalidades_inscripcion").getFullList<Modality>({ filter: pb.filter("evento = {:id}", { id: eventId }), sort: "orden,nombre" }); }
  catch (error) { if (error instanceof ClientResponseError && error.status === 404) return []; throw error; }
}
export async function modalityVersion(id: string): Promise<FormVersion> {
  const pb = await createServicePocketBase();
  const record = await pb.collection("versiones_modalidad").getOne<FormVersion>(id);
  return { ...record, esquema: formSchema.parse(record.esquema) };
}
export async function publicModalities(event: EventRecord): Promise<PublicModality[]> {
  const modes = await listModalities(event.id);
  if (!modes.length) return [{ id: "legacy", nombre: "Asistente", orden: 0, version: "legacy", definition: attendeeDefinition, entrega: event.certificado_asistencia !== "no" }];
  return Promise.all(modes.filter((m) => m.habilitada).map(async (m) => ({ id: m.id, nombre: m.nombre, orden: m.orden, version: m.version_publicada, definition: (await modalityVersion(m.version_publicada)).esquema, entrega: m.entrega })));
}
const inputSchema = z.object({ id: z.string().optional(), nombre: z.string().trim().min(2).max(160), codigo: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/), orden: z.number().int().min(0).max(1000), habilitada: z.boolean(), entrega: z.boolean(), definition: formSchema, textos: certificateTextInputSchema.partial(), clearTemplate: z.boolean().optional() });
export type ModalityInput = z.infer<typeof inputSchema>;
export async function saveModality(eventId: string, raw: ModalityInput, adminId: string, template?: File) {
  const input = inputSchema.parse(raw);
  if (template?.size) await validateCertificateTemplate(template);
  const pb = await createServicePocketBase();
  await pb.collection("eventos").getOne(eventId);
  return withOperationLock(pb, "evento:" + eventId, async (assertOwned) => {
    const existing = input.id ? await pb.collection("modalidades_inscripcion").getOne<Modality>(input.id) : null;
    if (existing && (existing.evento !== eventId || existing.codigo !== input.codigo)) throw new DomainError("INVALID", "La modalidad o su código no corresponde a este evento.");
    const previous = existing?.version_publicada ? await modalityVersion(existing.version_publicada) : null;
    const id = existing?.id ?? recordId();
    const changed = !previous || JSON.stringify(previous.esquema) !== JSON.stringify(input.definition);
    const versionId = changed ? recordId() : previous!.id;
    const batch = pb.createBatch();
    const data: Record<string, unknown> = { evento: eventId, codigo: input.codigo, nombre: input.nombre, orden: input.orden, habilitada: input.habilitada, entrega: input.entrega, textos_certificado: input.textos };
    if (input.clearTemplate) data.plantilla_certificado = "";
    if (template?.size) data.plantilla_certificado = template;
    if (existing) batch.collection("modalidades_inscripcion").update(id, data);
    else batch.collection("modalidades_inscripcion").create({ ...data, id });
    if (changed) batch.collection("versiones_modalidad").create({ id: versionId, modalidad: id, numero: (previous?.numero ?? 0) + 1, esquema: input.definition });
    batch.collection("modalidades_inscripcion").update(id, { version_publicada: versionId });
    await assertOwned();
    await batch.send();
    await audit({ adminId, action: "modalidad.guardada", entity: "modalidad", entityId: id, data: { evento: eventId, version: versionId } });
    return id;
  });
}
export async function copyModalities(sourceEvent: string, targetEvent: string, adminId: string) {
  if (sourceEvent === targetEvent) throw new DomainError("INVALID", "Elegí otro evento como origen.");
  const pb = await createServicePocketBase();
  const source = await listModalities(sourceEvent);
  const target = await listModalities(targetEvent);
  if (!source.length) throw new DomainError("NOT_CONFIGURED", "El evento de origen todavía no tiene una configuración para copiar.");
  const registrations = await pb.collection("inscripciones").getList(1, 1, { filter: pb.filter("evento = {:id}", { id: targetEvent }), fields: "id" });
  if (registrations.totalItems && source.some((mode) => target.some((m) => m.codigo === mode.codigo))) throw new DomainError("DUPLICATE", "El destino ya tiene participantes en sus modalidades. Configuralas individualmente para conservar sus reglas.");
  for (const mode of source) {
    let template: File | undefined;
    if (mode.plantilla_certificado) {
      const token = await pb.files.getToken();
      const response = await fetch(pb.files.getURL(mode as unknown as RecordModel, mode.plantilla_certificado, { token }), { cache: "no-store" });
      if (!response.ok) throw new DomainError("INVALID", "No se pudo copiar la plantilla.");
      template = new File([await response.arrayBuffer()], mode.plantilla_certificado, { type: response.headers.get("content-type") ?? "application/pdf" });
    }
    await saveModality(targetEvent, { id: target.find((m) => m.codigo === mode.codigo)?.id, codigo: mode.codigo, nombre: mode.nombre, orden: mode.orden, habilitada: mode.habilitada, entrega: mode.entrega, definition: (await modalityVersion(mode.version_publicada)).esquema, textos: mode.textos_certificado ?? {}, clearTemplate: !template }, adminId, template);
  }
}
