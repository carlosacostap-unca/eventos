import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { createEvent, getEventById, updateEvent } from "@/lib/services/events";
import { resolvePublicEventPage } from "@/lib/domain/public-event-page";
import { registerPublic } from "@/lib/services/registrations";
import type { EventInput } from "@/lib/domain/models";

describe.skipIf(process.env.RUN_MODALITIES_INTEGRATION !== "1")("configuración pública persistida en PocketBase local", () => {
  it("guarda preferencias por evento y las conserva al editar desde clientes anteriores sin cambiar inscripciones", async () => {
    if (process.env.POCKETBASE_URL !== "http://127.0.0.1:8099") throw new Error("Esta prueba solo admite la base local aislada.");
    const pb = await createServicePocketBase();
    const input: EventInput = { titulo: "Visibilidad de prueba", tipoEvento: "", descripcion: "Evento sintético para comprobar visibilidad.", slug: "visibilidad-" + randomUUID().slice(0, 8), inicio: new Date("2030-11-03T12:00:00Z"), fin: new Date("2030-11-03T14:00:00Z"), lugar: "Auditorio", cupo: 10, costo: "gratuito", certificadoAsistencia: "si", inscripcionHabilitada: true, estado: "publicado", paginaPublica: resolvePublicEventPage({ tipoEvento: false, duracion: false }) };
    const event = await createEvent(input);
    try {
      const person = await registerPublic(event, { nombres: "Ana", apellidos: "Prueba", documento: "12345678", email: "prueba@example.com" });
      expect((await getEventById(event.id))?.pagina_publica).toMatchObject({ tipoEvento: false, duracion: false, lugar: true });
      const legacy = { ...input }; delete legacy.paginaPublica;
      await updateEvent(event.id, { ...legacy, titulo: "Evento editado" });
      const updated = await getEventById(event.id);
      expect(updated?.pagina_publica).toMatchObject({ tipoEvento: false, duracion: false });
      expect(updated?.inicio).toBe(event.inicio); expect(updated?.fin).toBe(event.fin); expect(updated?.tipo_evento).toBe(event.tipo_evento);
      expect(await pb.collection("inscripciones").getOne(person.id)).toEqual(person);
      await updateEvent(event.id, { ...legacy, paginaPublica: resolvePublicEventPage({ tipoEvento: true, duracion: true }) });
      expect((await getEventById(event.id))?.pagina_publica).toMatchObject({ tipoEvento: true, duracion: true });
    } finally { await pb.collection("eventos").delete(event.id); }
  }, 30000);
});
