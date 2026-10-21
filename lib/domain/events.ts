import type { EventRecord } from "@/lib/domain/models";

export type RegistrationAvailability =
  | "disponible"
  | "cerrado"
  | "completo"
  | "finalizado";

type EventCapacity = Pick<EventRecord, "cupo" | "cupo_ilimitado">;

export function publicCapacity(event: EventCapacity): number | null {
  return event.cupo_ilimitado === true ? null : event.cupo;
}

export function isCapacityFull(event: EventCapacity, publicRegistrationCount: number): boolean {
  const capacity = publicCapacity(event);
  return capacity !== null && publicRegistrationCount >= capacity;
}

export function publicCapacityLabel(event: EventCapacity): string {
  return publicCapacity(event) === null ? "Sin límite de cupo" : `${event.cupo} lugares públicos`;
}

export function getRegistrationAvailability(
  event: Pick<EventRecord, "cupo" | "cupo_ilimitado" | "inscripcion_habilitada" | "estado" | "fin">,
  publicRegistrationCount: number,
  now = new Date(),
): RegistrationAvailability {
  if (event.estado === "finalizado" || new Date(event.fin) < now) return "finalizado";
  if (!event.inscripcion_habilitada || event.estado !== "publicado") return "cerrado";
  if (isCapacityFull(event, publicRegistrationCount)) return "completo";
  return "disponible";
}

export function nextPublicSlot(usedSlots: number[], capacity: number | null): number | null {
  const highest = usedSlots.reduce((highest, slot) => Math.max(highest, slot), 0);
  const next = highest + 1;
  return capacity === null || next <= capacity ? next : null;
}
