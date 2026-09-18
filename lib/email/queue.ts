import type { DeliveryRecord } from "@/lib/domain/models";

export type DeliveryAttempt = {
  date: string;
  status: "enviado" | "fallido";
  error?: string;
};

export function sanitizeMailError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Error desconocido";
  return message
    .replace(/(pass(word)?|token|secret|authorization)=?[^\s,;]*/gi, "$1=[oculto]")
    .slice(0, 500);
}

export async function processDeliveryAttempt(
  delivery: DeliveryRecord,
  dependencies: {
    send: () => Promise<void>;
    update: (data: {
      estado: "enviado" | "fallido";
      intentos: number;
      ultimo_intento: string;
      enviado_en?: string;
      error: string;
      historial: DeliveryAttempt[];
    }) => Promise<void>;
    now?: () => Date;
  },
) {
  const now = (dependencies.now ?? (() => new Date()))().toISOString();
  const history = [...(delivery.historial ?? [])];
  try {
    await dependencies.send();
    history.push({ date: now, status: "enviado" });
    await dependencies.update({
      estado: "enviado",
      intentos: delivery.intentos + 1,
      ultimo_intento: now,
      enviado_en: now,
      error: "",
      historial: history,
    });
    return "enviado" as const;
  } catch (error) {
    const safeError = sanitizeMailError(error);
    history.push({ date: now, status: "fallido", error: safeError });
    await dependencies.update({
      estado: "fallido",
      intentos: delivery.intentos + 1,
      ultimo_intento: now,
      error: safeError,
      historial: history,
    });
    return "fallido" as const;
  }
}
