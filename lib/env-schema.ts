import { z } from "zod";

const optionalText = z.string().trim().optional().default("");

export const serverEnvSchema = z.object({
  POCKETBASE_URL: z.url("POCKETBASE_URL debe ser una URL válida"),
  POCKETBASE_ADMIN_EMAIL: z
    .email("POCKETBASE_ADMIN_EMAIL debe ser un email válido"),
  POCKETBASE_ADMIN_PASSWORD: z
    .string()
    .min(1, "POCKETBASE_ADMIN_PASSWORD es obligatoria"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET debe tener al menos 32 caracteres"),
  INTERNAL_JOBS_SECRET: z
    .string()
    .min(32, "INTERNAL_JOBS_SECRET debe tener al menos 32 caracteres"),
  SMTP_HOST: optionalText,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM: optionalText,
  APP_URL: z.url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join(".") || "entorno")
      .join(", ");
    throw new Error("Configuración de servidor inválida: " + fields);
  }
  return result.data;
}
