import type { RegistrationRecord } from "@/lib/domain/models";

export function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

export function registrationsToCsv(registrations: RegistrationRecord[]): string {
  const headers = [
    "Nombres",
    "Apellidos",
    "Email",
    "Documento",
    "Origen",
    "Estado",
    "Fecha de inscripción",
    "Fecha de acreditación",
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
  ]);
  return "\uFEFF" + [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}
