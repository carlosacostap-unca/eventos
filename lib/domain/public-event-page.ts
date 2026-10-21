import { z } from "zod";

export const PUBLIC_EVENT_PAGE_OPTIONS = [
  { key: "tipoEvento", label: "Tipo de evento" },
  { key: "descripcion", label: "Descripción" },
  { key: "fechaHora", label: "Fecha y hora" },
  { key: "duracion", label: "Duración" },
  { key: "lugar", label: "Lugar" },
  { key: "participacion", label: "Participación gratuita o arancelada" },
  { key: "certificados", label: "Información de certificados" },
  { key: "disertantes", label: "Disertantes" },
] as const;

export const publicEventPageSchema = z.object({
  tipoEvento: z.boolean().default(true),
  descripcion: z.boolean().default(true),
  fechaHora: z.boolean().default(true),
  duracion: z.boolean().default(true),
  lugar: z.boolean().default(true),
  participacion: z.boolean().default(true),
  certificados: z.boolean().default(true),
  disertantes: z.boolean().default(true),
}).strict();

export type PublicEventPageSettings = z.infer<typeof publicEventPageSchema>;

export function resolvePublicEventPage(input: unknown): PublicEventPageSettings {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return publicEventPageSchema.parse(Object.fromEntries(PUBLIC_EVENT_PAGE_OPTIONS.map(({ key }) => [key, typeof source[key] === "boolean" ? source[key] : true])));
}

export function publicEventPageFromForm(data: FormData): PublicEventPageSettings | undefined {
  // Un formulario abierto antes del despliegue no debe restablecer preferencias guardadas.
  if (data.get("paginaPublicaConfigurada") !== "1") return undefined;
  return publicEventPageSchema.parse(Object.fromEntries(PUBLIC_EVENT_PAGE_OPTIONS.map(({ key }) => [key, data.get("paginaPublica_" + key) === "on"])));
}
