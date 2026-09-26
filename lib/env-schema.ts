import { z } from "zod";

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
