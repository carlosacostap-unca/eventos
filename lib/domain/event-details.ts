import type { EventRecord } from "@/lib/domain/models";

// PocketBase deja vacíos estos campos en eventos previos a esta función.
export function isEventFree(event: Pick<EventRecord, "costo">): boolean {
  return event.costo !== "arancelado";
}

export function offersAttendanceCertificate(
  event: Pick<EventRecord, "certificado_asistencia">,
): boolean {
  return event.certificado_asistencia !== "no";
}
