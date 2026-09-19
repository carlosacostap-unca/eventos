import { describe, expect, it } from "vitest";

import { isEventFree, offersAttendanceCertificate } from "@/lib/domain/event-details";

describe("atributos públicos del evento", () => {
  it("conserva los valores previos para eventos existentes", () => {
    expect(isEventFree({})).toBe(true);
    expect(offersAttendanceCertificate({})).toBe(true);
  });

  it("respeta las elecciones explícitas", () => {
    expect(isEventFree({ costo: "arancelado" })).toBe(false);
    expect(offersAttendanceCertificate({ certificado_asistencia: "no" })).toBe(false);
  });
});
