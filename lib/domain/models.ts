import { z } from "zod";

export const EVENT_STATUS = ["borrador", "publicado", "finalizado"] as const;
export const REGISTRATION_SOURCE = ["publica", "presencial"] as const;
export const DELIVERY_STATUS = ["pendiente", "enviado", "fallido"] as const;

const reservedPublicSlugs = new Set([
  "admin",
  "api",
  "eventos",
  "iniciar-sesion",
  "icon",
  "favicon",
  "apple-icon",
  "manifest",
  "robots",
  "sitemap",
]);

const requiredText = (label: string, min = 2, max = 160) =>
  z
    .string()
    .trim()
    .min(min, label + " es obligatorio")
    .max(max, label + " es demasiado largo");

export const eventInputSchema = z
  .object({
    titulo: requiredText("El título", 3, 160),
    tipoEvento: z.string().trim().min(1, "Seleccioná un tipo de evento"),
    descripcion: requiredText("La descripción", 10, 5000),
    slug: z
      .string()
      .trim()
      .min(3, "El identificador público es obligatorio")
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá minúsculas, números y guiones")
      .refine((slug) => !reservedPublicSlugs.has(slug), "Ese identificador público está reservado"),
    inicio: z.coerce.date(),
    fin: z.coerce.date(),
    lugar: requiredText("El lugar", 2, 240),
    cupo: z.coerce.number().int().min(1).max(100000),
    costo: z.enum(["gratuito", "arancelado"]),
    certificadoAsistencia: z.enum(["si", "no"]),
    inscripcionHabilitada: z.coerce.boolean(),
    estado: z.enum(EVENT_STATUS),
  })
  .refine((event) => event.fin >= event.inicio, {
    path: ["fin"],
    message: "La fecha de finalización debe ser posterior al inicio",
  });

export const registrationInputSchema = z.object({
  nombres: requiredText("Los nombres", 2, 120),
  apellidos: requiredText("Los apellidos", 2, 120),
  email: z.string().trim().toLowerCase().email("Ingresá un email válido").max(254),
  documento: z
    .string()
    .trim()
    .min(5, "Ingresá un documento válido")
    .max(32, "Ingresá un documento válido")
    .refine((value) => normalizeDocument(value).length >= 5, "Ingresá un documento válido"),
});

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresá un email válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export function normalizeDocument(value: string): string {
  return value.normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "").toUpperCase();
}

export type EventInput = z.infer<typeof eventInputSchema>;

export const speakerInputSchema = z.object({
  titulo: requiredText("El título", 2, 80),
  nombre: requiredText("El nombre", 2, 160),
  universidades: requiredText("La universidad de origen", 2, 500),
});
export type SpeakerInput = z.infer<typeof speakerInputSchema>;
export type SpeakerRecord = SpeakerInput & {
  id: string;
  evento: string;
  foto: string;
  created: string;
  updated: string;
};
export const eventTypeInputSchema = z.object({
  nombre: requiredText("El nombre", 2, 80),
  descripcion: z.string().trim().max(500, "La descripción es demasiado larga"),
  activo: z.boolean(),
});
export type EventTypeInput = z.infer<typeof eventTypeInputSchema>;
export type EventTypeRecord = EventTypeInput & { id: string; created: string; updated: string };
export type RegistrationInput = z.infer<typeof registrationInputSchema>;
export type EventStatus = (typeof EVENT_STATUS)[number];
export type RegistrationSource = (typeof REGISTRATION_SOURCE)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUS)[number];

export type EventRecord = {
  id: string;
  tipo_evento?: string;
  titulo: string;
  descripcion: string;
  slug: string;
  inicio: string;
  fin: string;
  lugar: string;
  cupo: number;
  costo?: "gratuito" | "arancelado" | "";
  certificado_asistencia?: "si" | "no" | "";
  inscripcion_habilitada: boolean;
  estado: EventStatus;
  plantilla_certificado?: string;
  created: string;
  updated: string;
};

export type RegistrationRecord = {
  id: string;
  evento: string;
  nombres: string;
  apellidos: string;
  email: string;
  documento: string;
  documento_normalizado: string;
  origen: RegistrationSource;
  numero_cupo_publico: number;
  acreditado: boolean;
  acreditado_en?: string;
  acreditado_por?: string;
  created: string;
  updated: string;
};

export type CertificateRecord = {
  id: string;
  evento: string;
  inscripcion: string;
  archivo: string;
  generado_en: string;
};

export type DeliveryRecord = {
  id: string;
  evento: string;
  inscripcion: string;
  certificado: string;
  estado: DeliveryStatus;
  intentos: number;
  ultimo_intento?: string;
  enviado_en?: string;
  error?: string;
  historial?: Array<{ date: string; status: "enviado" | "fallido"; error?: string }>;
};
