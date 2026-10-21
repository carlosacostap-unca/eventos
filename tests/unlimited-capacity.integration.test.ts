import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type PocketBase from "pocketbase";
import type { EventInput, EventRecord } from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { createEvent, getEventById, updateEvent } from "@/lib/services/events";
import { listModalities, saveModality } from "@/lib/services/modalities";
import { registerWithModality } from "@/lib/services/modal-registration";
import { createWalkIn, countPublicRegistrations, registerPublic } from "@/lib/services/registrations";
import { exhibitorDefinition } from "@/lib/domain/modalities";

async function clean(pb: PocketBase, eventId: string) {
  const rows = await Promise.all(["inscripciones", "modalidades_inscripcion"].map(name => pb.collection(name).getFullList({ filter: pb.filter("evento = {:id}", { id: eventId }), fields: "id" })));
  const ids = [eventId, ...rows.flat().map(row => row.id)];
  const audits = await pb.collection("auditoria").getFullList({ filter: ids.map(id => pb.filter("entidad_id = {:id}", { id })).join(" || "), fields: "id" });
  await pb.collection("eventos").delete(eventId);
  for (const row of audits) await pb.collection("auditoria").delete(row.id);
}
const person = (documento: string) => ({ nombres: "Persona", apellidos: "De prueba", documento, email: "prueba@example.com", respuestas: {} });

describe.skipIf(process.env.RUN_MODALITIES_INTEGRATION !== "1")("inscripción sin límite contra PocketBase local", () => {
  it("supera el cupo entre modalidades, conserva numeración única y puede volver a limitarse", async () => {
    if (process.env.POCKETBASE_URL !== "http://127.0.0.1:8099") throw new Error("Solo base local aislada.");
    const pb = await createServicePocketBase();
    const input: EventInput = { titulo: "Cupo ilimitado de prueba", tipoEvento: "", descripcion: "Evento sintético para verificar cupos.", slug: "ilimitado-" + randomUUID().slice(0, 8), inicio: new Date("2030-11-03T12:00:00Z"), fin: new Date("2030-11-03T14:00:00Z"), lugar: "Auditorio", cupo: 1, cupoIlimitado: true, costo: "gratuito", certificadoAsistencia: "si", inscripcionHabilitada: true, estado: "publicado" };
    const event = await createEvent(input);
    try {
      const attendee = (await listModalities(event.id))[0];
      const submit = (documento: string) => ({ modalidad: attendee.id, version: attendee.version_publicada, operacion: randomUUID(), principal: person(documento), integrantes: [] });
      const first = await registerWithModality(event.id, submit("81000001"));
      await pb.collection("inscripciones").update(first.id, { numero_cupo_publico: 100000 });
      const exhibitorId = await saveModality(event.id, { codigo: "expositor", nombre: "Expositor", orden: 1, habilitada: true, entrega: true, definition: exhibitorDefinition, textos: {} }, "");
      const exhibitor = (await listModalities(event.id)).find(mode => mode.id === exhibitorId)!;
      const student = await registerWithModality(event.id, { modalidad: exhibitor.id, version: exhibitor.version_publicada, operacion: randomUUID(), principal: { ...person("81000002"), respuestas: { titulo_trabajo: "Investigación de prueba" } }, integrantes: [{ ...person("81000003"), funcion: "director" }] });
      expect(student.numero_cupo_publico).toBe(100001);
      const concurrent = await Promise.all([registerWithModality(event.id, submit("81000004")), registerWithModality(event.id, submit("81000005"))]);
      expect(concurrent.map(row => row.numero_cupo_publico).sort()).toEqual([100002, 100003]);
      const present = await registerWithModality(event.id, submit("81000006"), { presencial: true });
      expect(present).toMatchObject({ acreditado: true, origen: "presencial", numero_cupo_publico: 0 });
      expect(await countPublicRegistrations(event.id)).toBe(4);
      const legacyInput = { ...input }; delete legacyInput.cupoIlimitado;
      await updateEvent(event.id, { ...legacyInput, titulo: "Edición anterior compatible" });
      expect((await getEventById(event.id))?.cupo_ilimitado).toBe(true);
      await updateEvent(event.id, { ...input, cupoIlimitado: false });
      await expect(registerWithModality(event.id, submit("81000007"))).rejects.toMatchObject({ code: "FULL" });
      await expect(registerWithModality(event.id, submit("81000008"), { presencial: true })).rejects.toMatchObject({ code: "CONFIRMATION_REQUIRED" });
      await updateEvent(event.id, { ...input, inscripcionHabilitada: false });
      await expect(registerWithModality(event.id, submit("81000009"))).rejects.toMatchObject({ code: "CLOSED" });
      await updateEvent(event.id, input);
      expect((await registerWithModality(event.id, submit("81000010"))).numero_cupo_publico).toBe(100004);
    } finally { await clean(pb, event.id); }
  }, 60000);
  it("respeta la misma opción en eventos sin modalidades migradas", async () => {
    if (process.env.POCKETBASE_URL !== "http://127.0.0.1:8099") throw new Error("Solo base local aislada.");
    const pb = await createServicePocketBase();
    const event = await pb.collection("eventos").create<EventRecord>({ titulo: "Evento anterior sin límite", slug: "anterior-ilimitado-" + randomUUID().slice(0, 8), descripcion: "Evento de prueba del lector anterior.", inicio: "2030-11-03T12:00:00Z", fin: "2030-11-03T14:00:00Z", lugar: "Auditorio", cupo: 1, cupo_ilimitado: true, estado: "publicado", inscripcion_habilitada: true });
    try {
      const first = await registerPublic(event, person("82000001"));
      await pb.collection("inscripciones").update(first.id, { numero_cupo_publico: 100000 });
      expect((await registerPublic(event, person("82000002"))).numero_cupo_publico).toBe(100001);
      expect((await createWalkIn(event.id, person("82000003"), "")).acreditado).toBe(true);
      expect(await countPublicRegistrations(event.id)).toBe(2);
      const limited = await pb.collection("eventos").update<EventRecord>(event.id, { cupo_ilimitado: false });
      await expect(registerPublic(limited, person("82000004"))).rejects.toMatchObject({ code: "FULL" });
      await expect(createWalkIn(event.id, person("82000005"), "")).rejects.toMatchObject({ code: "CONFIRMATION_REQUIRED" });
    } finally { await clean(pb, event.id); }
  }, 30000);
});
