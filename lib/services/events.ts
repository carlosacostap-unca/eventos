import "server-only";

import type { RecordModel } from "pocketbase";

import type { EventInput, EventRecord } from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";

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
  };
}

export async function createEvent(input: EventInput): Promise<EventRecord> {
  const pb = await createServicePocketBase();
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
