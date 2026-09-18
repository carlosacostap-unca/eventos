import type { RegistrationRecord } from "@/lib/domain/models";

export type EventMetrics = {
  publicas: number;
  presenciales: number;
  acreditados: number;
  ausentes: number;
  total: number;
  porcentajeAsistencia: number;
};

export function calculateEventMetrics(
  registrations: Array<Pick<RegistrationRecord, "origen" | "acreditado">>,
): EventMetrics {
  const publicas = registrations.filter((item) => item.origen === "publica").length;
  const presenciales = registrations.filter((item) => item.origen === "presencial").length;
  const acreditados = registrations.filter((item) => item.acreditado).length;
  const total = registrations.length;
  return {
    publicas,
    presenciales,
    acreditados,
    ausentes: total - acreditados,
    total,
    porcentajeAsistencia: total === 0 ? 0 : Math.round((acreditados / total) * 1000) / 10,
  };
}
