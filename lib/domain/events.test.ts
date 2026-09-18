import { describe, expect, it } from "vitest";

import { getRegistrationAvailability, nextPublicSlot } from "@/lib/domain/events";

const event = {
  cupo: 2,
  inscripcion_habilitada: true,
  estado: "publicado" as const,
  fin: "2099-01-01T00:00:00.000Z",
};

describe("disponibilidad de inscripción", () => {
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
