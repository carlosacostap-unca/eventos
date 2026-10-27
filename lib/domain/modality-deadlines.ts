export type ModalityDeadlines = { inscripcion_hasta?: string; presentaciones_hasta?: string };

// El valor guardado incluye el último segundo del minuto elegido en Argentina.
export function parseArgentinaDeadline(value: string): string {
  if (!value.trim()) return "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Revisá la fecha y hora de cierre.");
  const date = new Date(value + ":59.999-03:00");
  if (!Number.isFinite(date.getTime())) throw new Error("Revisá la fecha y hora de cierre.");
  return date.toISOString();
}

export function deadlinePassed(value?: string, now = new Date()): boolean {
  if (!value) return false;
  const lastInstant = new Date(value).getTime();
  return !Number.isFinite(lastInstant) || now.getTime() > lastInstant;
}

export function formatDeadline(value: string): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short", hourCycle: "h23" }).format(new Date(value));
}
