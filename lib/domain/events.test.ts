import { describe, expect, it } from "vitest";

import { getRegistrationAvailability, hasEventEnded, isCapacityFull, nextPublicSlot, publicCapacity, publicCapacityLabel } from "@/lib/domain/events";

const event = {
  cupo: 2,
  inscripcion_habilitada: true,
  estado: "publicado" as const,
  fin: "2099-01-01T00:00:00.000Z",
};

describe("disponibilidad de inscripción", () => {
  it("finaliza exactamente a la hora de cierre y compara correctamente la hora argentina", () => {
    const now = new Date("2026-10-27T15:00:00Z");
    expect(hasEventEnded({ ...event, fin: "2026-10-27T12:00:00-03:00" }, now)).toBe(true);
    expect(hasEventEnded({ ...event, fin: "2026-10-27T12:00:01-03:00" }, now)).toBe(false);
    expect(hasEventEnded({ ...event, estado: "finalizado" }, now)).toBe(true);
    expect(getRegistrationAvailability({ ...event, fin: now.toISOString() }, 0, now)).toBe("finalizado");
  });
  it("permite superar el cupo anterior sin límite y sigue respetando cierre manual y finalización", () => {
    const unlimited = { ...event, cupo_ilimitado: true };
    expect(publicCapacity(unlimited)).toBeNull(); expect(publicCapacityLabel(unlimited)).toBe("Sin límite de cupo");
    expect(isCapacityFull(unlimited, 500000)).toBe(false);
    expect(getRegistrationAvailability(unlimited, 500000)).toBe("disponible");
    expect(getRegistrationAvailability({ ...unlimited, inscripcion_habilitada: false }, 500000)).toBe("cerrado");
    expect(getRegistrationAvailability({ ...unlimited, estado: "finalizado" }, 0)).toBe("finalizado");
    expect(getRegistrationAvailability({ ...unlimited, fin: "2000-01-01T00:00:00Z" }, 0)).toBe("finalizado");
    expect(getRegistrationAvailability({ ...unlimited, cupo_ilimitado: false }, 3)).toBe("completo");
  });
  it("numera inscripciones ilimitadas por encima de cien mil sin imponer un límite oculto", () => {
    expect(nextPublicSlot([100000], null)).toBe(100001);
    expect(nextPublicSlot(Array.from({ length: 200000 }, (_, index) => index + 1), null)).toBe(200001);
  });
  it("cierra al completar el cupo y reabre al aumentarlo", () => {
    expect(getRegistrationAvailability(event, 2)).toBe("completo");
    expect(getRegistrationAvailability({ ...event, cupo: 3 }, 2)).toBe("disponible");
  });

  it("respeta el cierre manual", () => {
    expect(
      getRegistrationAvailability({ ...event, inscripcion_habilitada: false }, 0),
    ).toBe("cerrado");
  });

  it("asigna el siguiente número sin exceder el cupo", () => {
    expect(nextPublicSlot([1], 2)).toBe(2);
    expect(nextPublicSlot([1, 2], 2)).toBeNull();
  });
});
