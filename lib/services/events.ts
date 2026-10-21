import "server-only";

import type { RecordModel } from "pocketbase";

import type { CertificateTextSections } from "@/lib/domain/certificate-texts";
import type { EventInput, EventRecord } from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { recordId } from "@/lib/domain/fingerprints";
import { attendeeDefinition } from "@/lib/domain/modalities";
import { ClientResponseError } from "pocketbase";

function toEvent(record: RecordModel): EventRecord {
  return record as unknown as EventRecord;
}

export async function listEvents(): Promise<EventRecord[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection("eventos").getFullList({ sort: "-inicio" });
  return records.map(toEvent);
}

export async function listPublishedEvents(): Promise<EventRecord[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection("eventos").getFullList({
    filter: pb.filter('estado = "publicado"', {}),
    sort: "inicio",
  });
  return records.map(toEvent);
}

export async function getEventById(id: string): Promise<EventRecord | null> {
  const pb = await createServicePocketBase();
  try {
    return toEvent(await pb.collection("eventos").getOne(id));
  } catch {
    return null;
  }
}

export async function getEventBySlug(slug: string): Promise<EventRecord | null> {
  const pb = await createServicePocketBase();
  try {
    return toEvent(
      await pb.collection("eventos").getFirstListItem(pb.filter("slug = {:slug}", { slug })),
    );
  } catch {
    return null;
  }
}

function eventPayload(input: EventInput) {
  return {
    titulo: input.titulo,
    tipo_evento: input.tipoEvento,
    descripcion: input.descripcion,
    slug: input.slug,
    inicio: input.inicio.toISOString(),
    fin: input.fin.toISOString(),
    lugar: input.lugar,
    cupo: input.cupo,
    costo: input.costo,
    certificado_asistencia: input.certificadoAsistencia,
    inscripcion_habilitada: input.inscripcionHabilitada,
    estado: input.estado,
    ...(input.paginaPublica !== undefined ? { pagina_publica: input.paginaPublica } : {}),
  };
}

export async function createEvent(input: EventInput): Promise<EventRecord> {
  const pb = await createServicePocketBase();
  let configured = false;
  try { await pb.collection("modalidades_inscripcion").getList(1, 1, { fields: "id" }); configured = true; }
  catch (error) { if (!(error instanceof ClientResponseError) || error.status !== 404) throw error; }
  if (configured) {
    const id = recordId(), mode = recordId(), version = recordId();
    const batch = pb.createBatch();
    batch.collection("eventos").create({ ...eventPayload(input), id });
    batch.collection("modalidades_inscripcion").create({ id: mode, evento: id, codigo: "asistente", nombre: "Asistente", orden: 0, habilitada: true, entrega: input.certificadoAsistencia === "si" });
    batch.collection("versiones_modalidad").create({ id: version, modalidad: mode, numero: 1, esquema: attendeeDefinition });
    batch.collection("modalidades_inscripcion").update(mode, { version_publicada: version });
    await batch.send();
    return pb.collection("eventos").getOne<EventRecord>(id);
  }
  return toEvent(await pb.collection("eventos").create(eventPayload(input)));
}

export async function updateEvent(
  id: string,
  input: EventInput,
): Promise<EventRecord> {
  const pb = await createServicePocketBase();
  return toEvent(await pb.collection("eventos").update(id, eventPayload(input)));
}

export async function updateCertificateTemplate(id: string, file: File) {
  const pb = await createServicePocketBase();
  return toEvent(await pb.collection("eventos").update(id, { plantilla_certificado: file }));
}

export async function updateCertificateTexts(
  id: string,
  texts: CertificateTextSections,
) {
  const pb = await createServicePocketBase();
  return toEvent(
    await pb.collection("eventos").update(id, { textos_certificado: texts }),
  );
}
