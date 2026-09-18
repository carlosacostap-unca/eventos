import { describe, expect, it } from "vitest";

import { calculateEventMetrics } from "@/lib/domain/metrics";

describe("métricas", () => {
  it("evita divisiones por cero", () => {
    expect(calculateEventMetrics([]).porcentajeAsistencia).toBe(0);
  });

  it("separa origen y asistencia", () => {
    const metrics = calculateEventMetrics([
      { origen: "publica", acreditado: true },
      { origen: "publica", acreditado: false },
      { origen: "presencial", acreditado: true },
    ]);
    expect(metrics).toEqual({
      publicas: 2,
      presenciales: 1,
      acreditados: 2,
      ausentes: 1,
      total: 3,
      porcentajeAsistencia: 66.7,
    });
  });
});
