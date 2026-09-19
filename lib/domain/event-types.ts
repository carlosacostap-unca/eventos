import type { EventTypeRecord } from "@/lib/domain/models";

export function canAssignEventType(
  type: EventTypeRecord | null,
  currentTypeId?: string,
): boolean {
  return Boolean(type && (type.activo || type.id === currentTypeId));
}

export function eventTypeName(
  typeId: string | undefined,
  types: EventTypeRecord[],
): string {
  return types.find((type) => type.id === typeId)?.nombre ?? "Sin tipo";
}
