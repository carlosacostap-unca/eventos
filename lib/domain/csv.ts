import type { RegistrationRecord } from "@/lib/domain/models";

export function escapeCsv(value: unknown): string {
  const original = value == null ? "" : String(value);
  const text = /^[\s]*[=+@-]/.test(original) ? "'" + original : original;
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

export function registrationsToCsv(registrations: RegistrationRecord[], context: { modes?: Record<string, string>; labels?: Record<string, string> } = {}): string {
  const extra = [...new Set(registrations.flatMap((r) => Object.keys(r.respuestas ?? {}).map((key) => `${r.version_formulario ?? ""}:${key}`)))].sort();
  const headers = [
    "Nombres",
    "Apellidos",
    "Email",
    "Documento",
    "Origen",
    "Estado",
    "Fecha de inscripción",
    "Fecha de acreditación",
    "Modalidad", "Tipo de alta", ...extra.map((key) => context.labels?.[key] ?? key),
  ];
  const rows = registrations.map((registration) => [
    registration.nombres,
    registration.apellidos,
    registration.email,
    registration.documento,
    registration.origen,
    registration.acreditado ? "Acreditado" : "Ausente",
    registration.created,
    registration.acreditado_en ?? "",
    context.modes?.[registration.modalidad ?? ""] ?? "Asistente", registration.tipo_alta ?? "principal",
    ...extra.map((key) => { const [version, id] = key.split(":"); const value = version === (registration.version_formulario ?? "") ? registration.respuestas?.[id] : ""; return Array.isArray(value) ? value.join("; ") : value; }),
  ]);
  return "\uFEFF" + [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}
