import "server-only";

import { ClientResponseError, type RecordModel } from "pocketbase";

import type { SpeakerInput, SpeakerRecord } from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";

const collection = "disertantes";
const linksCollection = "participaciones_disertantes";

function toSpeaker(record: RecordModel): SpeakerRecord {
  return record as unknown as SpeakerRecord;
}

export async function listSpeakersByEvent(eventId: string): Promise<SpeakerRecord[]> {
  const pb = await createServicePocketBase();
  const links = await pb.collection(linksCollection).getFullList({
    filter: pb.filter("evento = {:eventId}", { eventId }),
    sort: "created",
    expand: "disertante",
  });
  return links.flatMap((link) => {
    const speaker = link.expand?.disertante;
    return speaker && !Array.isArray(speaker) ? [toSpeaker(speaker)] : [];
  });
}

export async function listAllSpeakers(): Promise<SpeakerRecord[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection(collection).getFullList({ sort: "nombre" });
  return records.map(toSpeaker);
}

export async function getSpeakerById(id: string): Promise<SpeakerRecord | null> {
  const pb = await createServicePocketBase();
  try {
    return toSpeaker(await pb.collection(collection).getOne(id));
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) return null;
    throw error;
  }
}

export async function listSpeakerEventIds(speakerId: string): Promise<string[]> {
  const pb = await createServicePocketBase();
  const links = await pb.collection(linksCollection).getFullList({
    filter: pb.filter("disertante = {:speakerId}", { speakerId }),
    fields: "evento",
  });
  return links.map((link) => String(link.evento));
}

export async function isSpeakerLinkedToEvent(
  eventId: string,
  speakerId: string,
): Promise<boolean> {
  const pb = await createServicePocketBase();
  const links = await pb.collection(linksCollection).getList(1, 1, {
    filter: pb.filter(
      "evento = {:eventId} && disertante = {:speakerId}",
      { eventId, speakerId },
    ),
    fields: "id",
  });
  return links.totalItems > 0;
}

export async function linkSpeakerToEvent(
  eventId: string,
  speakerId: string,
): Promise<boolean> {
  if (await isSpeakerLinkedToEvent(eventId, speakerId)) return false;
  const pb = await createServicePocketBase();
  await pb.collection(linksCollection).create({ evento: eventId, disertante: speakerId });
  return true;
}

export async function unlinkSpeakerFromEvent(
  eventId: string,
  speakerId: string,
): Promise<boolean> {
  const pb = await createServicePocketBase();
  let link: RecordModel;
  try {
    link = await pb.collection(linksCollection).getFirstListItem(
      pb.filter("evento = {:eventId} && disertante = {:speakerId}", {
        eventId,
        speakerId,
      }),
    );
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) return false;
    throw error;
  }
  await pb.collection(linksCollection).delete(link.id);
  return true;
}

export async function createSpeaker(
  eventId: string,
  input: SpeakerInput,
  photo: File,
): Promise<SpeakerRecord> {
  const pb = await createServicePocketBase();
  const speaker = await pb.collection(collection).create({
    evento: eventId,
    vinculos_migrados: true,
    ...input,
    foto: photo,
  });
  try {
    await pb.collection(linksCollection).create({
      evento: eventId,
      disertante: speaker.id,
    });
  } catch (error) {
    await pb.collection(collection).delete(speaker.id).catch(() => {});
    throw error;
  }
  return toSpeaker(speaker);
}

export async function updateSpeaker(
  id: string,
  input: SpeakerInput,
  photo?: File,
): Promise<SpeakerRecord> {
  const pb = await createServicePocketBase();
  return toSpeaker(await pb.collection(collection).update(id, {
    ...input,
    ...(photo ? { foto: photo } : {}),
  }));
}
