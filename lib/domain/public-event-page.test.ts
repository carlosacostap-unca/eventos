import { describe, expect, it } from "vitest";
import { PUBLIC_EVENT_PAGE_OPTIONS, publicEventPageFromForm, publicEventPageSchema, resolvePublicEventPage } from "./public-event-page";

describe("visibilidad de la página pública", () => {
  it("mantiene visibles los datos de eventos anteriores y completa opciones nuevas sin perder las elecciones existentes", () => {
    for (const input of [undefined, null, {}]) expect(Object.values(resolvePublicEventPage(input)).every(Boolean)).toBe(true);
    expect(resolvePublicEventPage({ tipoEvento: false, duracion: false })).toMatchObject({ tipoEvento: false, duracion: false, lugar: true, fechaHora: true });
    expect(publicEventPageSchema.safeParse({ duracion: "false" }).success).toBe(false);
  });
  it("distingue un formulario anterior de una elección explícita de ocultar todos los datos", () => {
    const data = new FormData();
    expect(publicEventPageFromForm(data)).toBeUndefined();
    data.set("paginaPublicaConfigurada", "1");
    expect(PUBLIC_EVENT_PAGE_OPTIONS.every(({ key }) => publicEventPageFromForm(data)?.[key] === false)).toBe(true);
    data.set("paginaPublica_fechaHora", "on");
    expect(publicEventPageFromForm(data)).toMatchObject({ tipoEvento: false, duracion: false, fechaHora: true });
  });
});
