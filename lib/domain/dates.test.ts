import { describe, expect, it } from "vitest";

import {
  parseArgentinaDateTime,
  toArgentinaDateTimeLocal,
} from "@/lib/domain/dates";

describe("fechas de eventos", () => {
  it("interpreta datetime-local con la zona horaria de Argentina", () => {
    expect(new Date(parseArgentinaDateTime("2026-09-16T10:30")).toISOString()).toBe(
      "2026-09-16T13:30:00.000Z",
    );
  });

  it("muestra la fecha guardada en horario argentino", () => {
    expect(toArgentinaDateTimeLocal("2026-09-16T13:30:00.000Z")).toBe(
      "2026-09-16T10:30",
    );
  });
});
