import { randomUUID } from "node:crypto";
import PocketBase from "pocketbase";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { createEvent } from "@/lib/services/events";
import { listModalities, saveModality } from "@/lib/services/modalities";
import { registerWithModality, eventExhibitions } from "@/lib/services/modal-registration";
import { findEditableRegistration } from "@/lib/services/public-registration-edit";
import { findPresentationWorks, uploadExhibitionPresentation, getPresentationDownload } from "@/lib/services/presentations";
import { exhibitorDefinition } from "@/lib/domain/modalities";
import { migratePresentations } from "@/scripts/migrate-presentations";
import { powerpointFixture } from "./presentation-fixtures";

const enabled = process.env.RUN_PRESENTATIONS_INTEGRATION === "1";
const person = (documento: string, nombres = "Alumno") => ({ nombres, apellidos: "Prueba", documento: documento, email: `persona${documento}@example.com`, respuestas: {} });
async function pdf(name: string) { const doc = await PDFDocument.create(); doc.addPage().drawText(name); return new File([(await doc.save()).slice().buffer as ArrayBuffer], name + ".pdf", { type: "application/pdf" }); }
async function bytes(stream: ReadableStream<Uint8Array>) { return new Uint8Array(await new Response(stream).arrayBuffer()); }

describe.skipIf(!enabled)("presentaciones finales contra PocketBase local aislado", () => {
  it("migra sin perder datos y mantiene archivos por trabajo, permisos, reemplazo y descargas privadas", async () => {
    if (process.env.POCKETBASE_URL !== "http://127.0.0.1:8099" || process.env.POCKETBASE_ADMIN_PASSWORD !== "TestOnly-Roles-2026!") throw new Error("Solo base local aislada con credenciales sintéticas.");
    const admin = new PocketBase(process.env.POCKETBASE_URL); admin.autoCancellation(false);
    await admin.collection("_superusers").authWithPassword("test-admin@example.com", "TestOnly-Roles-2026!");
    const before = await admin.collection("exposiciones").getFullList();
    await migratePresentations(admin, true);
    expect((await migratePresentations(admin, true)).camposAgregados).toEqual([]);
    expect((await admin.collection("exposiciones").getFullList()).map((row) => row.id)).toEqual(before.map((row) => row.id));
    const pb = await createServicePocketBase();
    const event = await createEvent({ titulo: "Entrega de presentaciones de prueba", descripcion: "Evento local aislado con archivos sintéticos.", slug: "presentaciones-" + randomUUID().slice(0, 8), tipoEvento: "", lugar: "Facultad", inicio: new Date("2030-10-27T12:00:00Z"), fin: new Date("2030-10-27T18:00:00Z"), cupo: 100, costo: "gratuito", certificadoAsistencia: "si", inscripcionHabilitada: true, estado: "publicado" });
    try {
      const modeId = await saveModality(event.id, { codigo: "expositor", nombre: "Expositor", orden: 1, habilitada: true, entrega: true, definition: exhibitorDefinition, textos: {} }, "");
      const mode = (await listModalities(event.id)).find((m) => m.id === modeId)!;
      const input = { modalidad: mode.id, version: mode.version_publicada, operacion: randomUUID(), principal: { ...person("80100101"), respuestas: { titulo_trabajo: "Primer trabajo" } }, integrantes: [{ ...person("80100102", "Director"), funcion: "director" }, { ...person("80100103", "Segunda"), funcion: "segundo_expositor" }] };
      const original = await pdf("primera-version");
      await expect(registerWithModality(event.id, { ...input, integrantes: [] }, { presentation: original })).rejects.toThrow();
      expect((await eventExhibitions(event.id)).exhibitions).toHaveLength(0);
      const student = await registerWithModality(event.id, input, { presentation: original });
      expect((await registerWithModality(event.id, input, { presentation: original })).id).toBe(student.id);
      const first = (await eventExhibitions(event.id)).exhibitions[0];
      expect(first).toMatchObject({ presentacion_nombre: original.name, presentacion_formato: "pdf" });
      const originalDownload = await getPresentationDownload(first.id, event.id);
      expect(await bytes(originalDownload.body)).toEqual(new Uint8Array(await original.arrayBuffer()));
      const anonymous = new PocketBase(pb.baseURL);
      const firstRaw = await admin.collection("exposiciones").getOne(first.id);
      expect([403, 404]).toContain((await fetch(anonymous.files.getURL(firstRaw, first.presentacion_final!))).status);
      const lookup = (await findEditableRegistration(input.principal.documento, event.id))!;
      const secondInput = { ...input, operacion: randomUUID(), principal: { ...input.principal, respuestas: { titulo_trabajo: "Segundo trabajo" } } };
      await registerWithModality(event.id, secondInput, { editToken: lookup.token, newExhibition: true });
      const groups = (await eventExhibitions(event.id)).exhibitions;
      const second = groups.find((g) => g.id !== first.id)!;
      expect(second.presentacion_final).toBe("");
      const delivery = await findPresentationWorks(event.id, input.principal.documento);
      expect(delivery.works).toHaveLength(2);
      const revision = delivery.works.find((work) => work.id === first.id)!.revision;
      const replacement = await pdf("version-final");
      const result = await uploadExhibitionPresentation(event.id, first.id, input.principal.documento, delivery.token, revision, replacement);
      expect(result.filename).toBe("version-final.pdf");
      expect((await pb.collection("exposiciones").getOne(second.id)).presentacion_final).toBe("");
      // Reintento de la misma entrega es idempotente aunque se haya perdido la respuesta.
      expect(await uploadExhibitionPresentation(event.id, first.id, input.principal.documento, delivery.token, revision, replacement)).toEqual(result);
      await expect(uploadExhibitionPresentation(event.id, first.id, input.principal.documento, delivery.token, revision, await pdf("obsoleta"))).rejects.toThrow("reemplazada");
      const stored = await pb.collection("exposiciones").getOne(first.id);
      await expect(uploadExhibitionPresentation(event.id, first.id, input.principal.documento, delivery.token, result.revision, new File(["no PDF"], "incorrecto.pdf"))).rejects.toThrow("contenido");
      expect((await pb.collection("exposiciones").getOne(first.id)).presentacion_final).toBe(stored.presentacion_final);
      expect(await bytes((await getPresentationDownload(first.id, event.id)).body)).toEqual(new Uint8Array(await replacement.arrayBuffer()));
      await expect(getPresentationDownload(first.id, "other-event")).rejects.toThrow("no está disponible");
      const linked = await findPresentationWorks(event.id, "80100103");
      expect(linked.works.map((work) => work.id).sort()).toEqual([first.id, second.id].sort());
      await uploadExhibitionPresentation(event.id, second.id, "80100103", linked.token, "", original);
      const powerpointLookup = await findPresentationWorks(event.id, input.principal.documento);
      const powerpoint = powerpointFixture();
      await uploadExhibitionPresentation(event.id, second.id, input.principal.documento, powerpointLookup.token, powerpointLookup.works.find((work) => work.id === second.id)!.revision, powerpoint);
      const powerpointDownload = await getPresentationDownload(second.id, event.id);
      expect(powerpointDownload.format).toBe("pptx");
      expect(await bytes(powerpointDownload.body)).toEqual(new Uint8Array(await powerpoint.arrayBuffer()));
      expect((await findPresentationWorks(event.id, "80100102")).works).toHaveLength(0);
      const directorLookup = (await findEditableRegistration("80100102", event.id))!;
      await expect(uploadExhibitionPresentation(event.id, first.id, "80100102", directorLookup.token, result.revision, original)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await expect(uploadExhibitionPresentation("other-event", first.id, input.principal.documento, delivery.token, result.revision, original)).rejects.toThrow();
      await expect(uploadExhibitionPresentation(event.id, first.id, "80100103", "invalid-token", result.revision, original)).rejects.toThrow();
      const editLookup = (await findEditableRegistration(input.principal.documento, event.id))!;
      await registerWithModality(event.id, { ...input, operacion: randomUUID(), principal: { ...input.principal, respuestas: { titulo_trabajo: "Primer trabajo corregido" } } }, { editToken: editLookup.token, exhibitionId: first.id });
      expect((await pb.collection("exposiciones").getOne(first.id)).presentacion_final).toBe(stored.presentacion_final);
      // Cerrar las inscripciones no impide entregar un trabajo ya registrado.
      await admin.collection("eventos").update(event.id, { inscripcion_habilitada: false });
      expect((await findPresentationWorks(event.id, input.principal.documento)).works).toHaveLength(2);
      const fileRows = await admin.collection("exposiciones").getFullList({ filter: admin.filter("evento = {:id}", { id: event.id }) });
      expect(fileRows.every((row) => !!row.presentacion_final)).toBe(true);
    } finally { if (process.env.KEEP_PRESENTATIONS_FIXTURE !== "1") await admin.collection("eventos").delete(event.id); else console.log("PRESENTATIONS_EVENT=" + event.id + " SLUG=" + event.slug); }
  }, 120000);
});
