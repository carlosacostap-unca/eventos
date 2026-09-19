import "server-only";

import { ClientResponseError, type RecordModel } from "pocketbase";

import type { SpeakerInput, SpeakerRecord } from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";

const collection = "disertantes";

function toSpeaker(record: RecordModel): SpeakerRecord {
  return record as unknown as SpeakerRecord;
}

export async function listSpeakersByEvent(eventId: string): Promise<SpeakerRecord[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection(collection).getFullList({
    filter: pb.filter("evento = {:eventId}", { eventId }),
    sort: "created",
  });
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

export async function createSpeaker(
  eventId: string,
  input: SpeakerInput,
  photo: File,
): Promise<SpeakerRecord> {
  const pb = await createServicePocketBase();
  return toSpeaker(await pb.collection(collection).create({
    evento: eventId,
    ...input,
    foto: photo,
  }));
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

export async function deleteSpeaker(id: string): Promise<void> {
  const pb = await createServicePocketBase();
  await pb.collection(collection).delete(id);
}
