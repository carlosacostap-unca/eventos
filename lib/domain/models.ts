import { z } from "zod";

export const EVENT_STATUS = ["borrador", "publicado", "finalizado"] as const;
export const REGISTRATION_SOURCE = ["publica", "presencial"] as const;
export const DELIVERY_STATUS = ["pendiente", "enviado", "fallido"] as const;

const requiredText = (label: string, min = 2, max = 160) =>
  z
    .string()
    .trim()
    .min(min, label + " es obligatorio")
    .max(max, label + " es demasiado largo");

export const eventInputSchema = z
  .object({
    titulo: requiredText("El título", 3, 160),
    descripcion: requiredText("La descripción", 10, 5000),
    slug: z
      .string()
      .trim()
      .min(3, "El identificador público es obligatorio")
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá minúsculas, números y guiones"),
    inicio: z.coerce.date(),
    fin: z.coerce.date(),
    lugar: requiredText("El lugar", 2, 240),
    cupo: z.coerce.number().int().min(1).max(100000),
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
export type RegistrationInput = z.infer<typeof registrationInputSchema>;
export type EventStatus = (typeof EVENT_STATUS)[number];
export type RegistrationSource = (typeof REGISTRATION_SOURCE)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUS)[number];

export type EventRecord = {
  id: string;
  titulo: string;
  descripcion: string;
  slug: string;
  inicio: string;
  fin: string;
  lugar: string;
  cupo: number;
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
