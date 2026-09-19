import { describe, expect, it } from "vitest";

import { canAssignEventType, eventTypeName } from "@/lib/domain/event-types";
import { eventInputSchema, eventTypeInputSchema, type EventTypeRecord } from "@/lib/domain/models";

const type: EventTypeRecord = {
  id: "evtypeexample01",
  nombre: "Jornada",
  descripcion: "",
  activo: true,
  created: "",
  updated: "",
};

describe("tipos de eventos", () => {
  it("requiere un tipo al crear un evento", () => {
    const result = eventInputSchema.safeParse({
      titulo: "Jornada de extensión",
      descripcion: "Un evento de prueba",
      slug: "jornada-extension",
      inicio: new Date("2026-10-01T12:00:00Z"),
      fin: new Date("2026-10-01T13:00:00Z"),
      lugar: "Campus",
      cupo: 100,
      inscripcionHabilitada: false,
      estado: "borrador",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nombres vacíos y permite desactivar un tipo", () => {
    expect(eventTypeInputSchema.safeParse({ nombre: " ", descripcion: "", activo: true }).success).toBe(false);
    expect(eventTypeInputSchema.safeParse({ nombre: "Jornada", descripcion: "", activo: false }).success).toBe(true);
  });

  it("solo permite usar un tipo inactivo si ya estaba asignado", () => {
    const inactive = { ...type, activo: false };
    expect(canAssignEventType(type)).toBe(true);
    expect(canAssignEventType(inactive)).toBe(false);
    expect(canAssignEventType(inactive, inactive.id)).toBe(true);
    expect(canAssignEventType(null)).toBe(false);
  });

  it("muestra los eventos anteriores sin tipo", () => {
    expect(eventTypeName(undefined, [type])).toBe("Sin tipo");
    expect(eventTypeName(type.id, [type])).toBe("Jornada");
  });
});
