export type StaffRole = "admin" | "personal";
export type EventRole = "administrador_evento" | "acreditador";
export type EventCapability = "manage" | "accredit";

export function isStaffRole(value: unknown): value is StaffRole {
  return value === "admin" || value === "personal";
}

export function permitsEvent(role: EventRole | null, capability: EventCapability) {
  return role === "administrador_evento" || (role === "acreditador" && capability === "accredit");
}
