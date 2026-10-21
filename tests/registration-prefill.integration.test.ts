import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { createEvent } from "@/lib/services/events";
import { registerPublic, setAttendance } from "@/lib/services/registrations";
import { findRegistrationIdentity, allowRegistrationPrefill } from "@/lib/services/registration-prefill";
import { generateCertificates, getCertificateDownload, listCertificateRows } from "@/lib/services/certificates";
import { deriveLookupLimitKey } from "@/lib/certificates/public-access";

describe.skipIf(process.env.RUN_MODALITIES_INTEGRATION !== "1")("precarga por DNI contra PocketBase local aislado", () => {
  it("reutiliza y permite corregir datos sin modificar inscripciones ni PDFs anteriores", async () => {
    if (process.env.POCKETBASE_URL !== "http://127.0.0.1:8099") throw new Error("Solo se admite la base local de pruebas.");
    const pb = await createServicePocketBase();
    const events: string[] = [];
    const token = randomUUID().slice(0, 8);
    const input = { titulo: "Precarga de prueba", tipoEvento: "", descripcion: "Evento sintético para comprobar precarga por documento.", inicio: new Date("2030-11-03T12:00:00Z"), fin: new Date("2030-11-03T14:00:00Z"), lugar: "Facultad", cupo: 100, costo: "gratuito" as const, certificadoAsistencia: "si" as const, inscripcionHabilitada: true, estado: "publicado" as const };
    try {
      const old = await createEvent({ ...input, slug: "historia-dni-" + token }); events.push(old.id);
      const person = { nombres: "Ana", apellidos: "Histórica", documento: String(60000000 + Math.floor(Math.random() * 9999999)), email: "anterior@example.com" };
      const historical = await registerPublic(old, person);
      await setAttendance(historical.id, true, "", old.id);
      await generateCertificates(old.id, "");
      const certificate = (await listCertificateRows(old.id))[0].certificate;
      const before = await pb.collection("inscripciones").getOne(historical.id);
      const certificateBefore = await pb.collection("certificados").getOne(certificate.id);
      const pdfBefore = await getCertificateDownload(certificate.id, { registrationIds: [historical.id], certificateIds: [] });
      const recent = await createEvent({ ...input, slug: "reciente-dni-" + token }); events.push(recent.id);
      const revised = { ...person, apellidos: "Actualizada", email: "reciente@example.com" };
      const recentRegistration = await registerPublic(recent, revised);
      const target = await createEvent({ ...input, slug: "precarga-dni-" + token }); events.push(target.id);
      const dotted = person.documento.slice(0, 2) + "." + person.documento.slice(2, 5) + "." + person.documento.slice(5);
      expect(await findRegistrationIdentity(dotted, target.id)).toEqual(revised);
      expect(await findRegistrationIdentity(dotted, old.id)).toEqual(person);
      expect(await findRegistrationIdentity("ZZ" + token, target.id)).toBeNull();
      const edited = { ...revised, apellidos: "Corregida", email: "nuevo@example.com" };
      const registered = await registerPublic(target, edited);
      expect(registered).toMatchObject({ ...edited, acreditado: false });
      expect(await findRegistrationIdentity(dotted, target.id)).toEqual(edited);
      await expect(registerPublic(target, edited)).rejects.toThrow();
      expect(await pb.collection("inscripciones").getOne(historical.id)).toEqual(before);
      expect(await pb.collection("inscripciones").getOne(recentRegistration.id)).toEqual(recentRegistration);
      expect(await pb.collection("certificados").getOne(certificate.id)).toEqual(certificateBefore);
      expect((await getCertificateDownload(certificate.id, { registrationIds: [historical.id], certificateIds: [] })).bytes).toEqual(pdfBefore.bytes);
    } finally {
      for (const id of events) await pb.collection("eventos").delete(id);
    }
  }, 60000);

  it("persiste el límite por origen sin permitir eludirlo cambiando de documento", async () => {
    if (process.env.POCKETBASE_URL !== "http://127.0.0.1:8099") throw new Error("Solo se admite la base local de pruebas.");
    const pb = await createServicePocketBase();
    const origin = "test-prefill-" + randomUUID();
    const key = deriveLookupLimitKey({ secret: process.env.SESSION_SECRET!, origin: "registration-prefill:" + origin, normalizedDocument: "all-documents" });
    try {
      for (let i = 0; i < 30; i++) expect(await allowRegistrationPrefill(origin)).toBe(true);
      expect(await allowRegistrationPrefill(origin)).toBe(false);
      const record = await pb.collection("limites_consulta_certificados").getFirstListItem(pb.filter("clave = {:key}", { key }));
      expect(record.intentos).toBe(30);
      expect(record.clave).not.toContain(origin);
      expect((await pb.collection("bloqueos_operacion").getList(1, 1, { filter: pb.filter("clave = {:key}", { key: "prefill:" + key }) })).totalItems).toBe(0);
    } finally {
      const records = await pb.collection("limites_consulta_certificados").getFullList({ filter: pb.filter("clave = {:key}", { key }) });
      for (const record of records) await pb.collection("limites_consulta_certificados").delete(record.id);
    }
  }, 60000);
});
