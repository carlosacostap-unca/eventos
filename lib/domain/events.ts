import type { EventRecord } from "@/lib/domain/models";

export type RegistrationAvailability =
  | "disponible"
  | "cerrado"
  | "completo"
  | "finalizado";

export function getRegistrationAvailability(
  event: Pick<EventRecord, "cupo" | "inscripcion_habilitada" | "estado" | "fin">,
  publicRegistrationCount: number,
  now = new Date(),
): RegistrationAvailability {
  if (event.estado === "finalizado" || new Date(event.fin) < now) return "finalizado";
  if (!event.inscripcion_habilitada || event.estado !== "publicado") return "cerrado";
  if (publicRegistrationCount >= event.cupo) return "completo";
  return "disponible";
}

export function nextPublicSlot(usedSlots: number[], capacity: number): number | null {
  const highest = usedSlots.length ? Math.max(...usedSlots) : 0;
  const next = highest + 1;
  return next <= capacity ? next : null;
}
