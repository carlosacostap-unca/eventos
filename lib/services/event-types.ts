import "server-only";

import { ClientResponseError, type RecordModel } from "pocketbase";

import type { EventTypeInput, EventTypeRecord } from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";

const collection = "tipos_evento";

function toEventType(record: RecordModel): EventTypeRecord {
  return record as unknown as EventTypeRecord;
}

export async function listEventTypes(): Promise<EventTypeRecord[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection(collection).getFullList({ sort: "nombre" });
  return records.map(toEventType);
}

export async function getEventTypeById(id: string): Promise<EventTypeRecord | null> {
  const pb = await createServicePocketBase();
  try {
    return toEventType(await pb.collection(collection).getOne(id));
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) return null;
    throw error;
  }
}

export async function createEventType(input: EventTypeInput): Promise<EventTypeRecord> {
  const pb = await createServicePocketBase();
  return toEventType(await pb.collection(collection).create(input));
}

export async function updateEventType(
  id: string,
  input: EventTypeInput,
): Promise<EventTypeRecord> {
  const pb = await createServicePocketBase();
  return toEventType(await pb.collection(collection).update(id, input));
}
