import "server-only";
import { ClientResponseError } from "pocketbase";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { DomainError } from "@/lib/domain/errors";
import { fingerprint, recordId } from "@/lib/domain/fingerprints";
import { normalizeDocument, type EventRecord, type RegistrationRecord } from "@/lib/domain/models";
import { coherentIdentity, parseSubmission, type Modality, type Exhibition, type ExhibitionMember } from "@/lib/domain/modalities";
import { getRegistrationAvailability, isCapacityFull, nextPublicSlot, publicCapacity } from "@/lib/domain/events";
import { modalityVersion } from "./modalities";
import { withOperationLock } from "./operation-lock";

export async function registerWithModality(eventId: string, raw: unknown, options: { presencial?: boolean; allowOverCapacity?: boolean; strictCapacity?: boolean; adminId?: string } = {}): Promise<RegistrationRecord> {
  const pb = await createServicePocketBase();
  return withOperationLock(pb, "evento:" + eventId, async (assertOwned) => {
    const event = await pb.collection("eventos").getOne<EventRecord>(eventId);
    const modeId = String((raw as Record<string, unknown>)?.modalidad ?? "");
    const mode = await pb.collection("modalidades_inscripcion").getOne<Modality>(modeId);
    if (mode.evento !== eventId || !mode.habilitada) throw new DomainError("CLOSED", "La modalidad no está disponible.");
    const version = await modalityVersion(mode.version_publicada);
    if ((raw as Record<string, unknown>)?.version !== version.id) throw new DomainError("INVALID", "El formulario cambió. Actualizá la página antes de inscribirte.");
    const input = parseSubmission(version.esquema, raw);
    const signature = fingerprint({ input, presencial: !!options.presencial });
    const operations = await pb.collection("operaciones_inscripcion").getFullList({ filter: pb.filter("evento = {:eventId} && clave = {:key}", { eventId, key: input.operacion }) });
    if (operations[0]) {
      if (operations[0].huella !== signature) throw new DomainError("INVALID", "La solicitud ya fue utilizada con otros datos.");
      return pb.collection("inscripciones").getOne<RegistrationRecord>(operations[0].participante);
    }
    const all = await pb.collection("inscripciones").getFullList<RegistrationRecord>({ filter: pb.filter("evento = {:eventId}", { eventId }) });
    const publicPrincipals = all.filter((r) => r.origen === "publica" && r.tipo_alta !== "vinculada");
    if (options.presencial && options.strictCapacity && isCapacityFull(event, all.filter(r => r.tipo_alta !== "vinculada").length)) {
      throw new DomainError("FULL", "El cupo del evento está completo. No se pueden agregar más personas.");
    }
    if (!options.presencial) {
      const availability = getRegistrationAvailability(event, publicPrincipals.length);
      if (availability !== "disponible") throw new DomainError(availability === "completo" ? "FULL" : "CLOSED", availability === "completo" ? "El cupo del evento está completo." : "La inscripción no está disponible.");
    } else if (isCapacityFull(event, publicPrincipals.length) && !options.allowOverCapacity) throw new DomainError("CONFIRMATION_REQUIRED", "Confirmá que querés superar el cupo público.");
    const slot = options.presencial ? 0 : nextPublicSlot(publicPrincipals.map((p) => p.numero_cupo_publico), publicCapacity(event));
    if (slot === null) throw new DomainError("FULL", "El cupo del evento está completo.");
    const batch = pb.createBatch();
    const people = [input.principal, ...input.integrantes];
    const ids: string[] = [];
    for (const [index, person] of people.entries()) {
      const document = normalizeDocument(person.documento);
      const existing = all.find((r) => r.documento_normalizado === document);
      if (existing && (existing.modalidad !== mode.id || !coherentIdentity(existing, person))) throw new DomainError("DUPLICATE", "Un DNI ya está registrado en otra modalidad o con datos diferentes. Consultá con la organización.");
      if (existing && index === 0 && existing.tipo_alta !== "vinculada") throw new DomainError("DUPLICATE", "La persona ya tiene una inscripción principal en este evento.");
      const id = existing?.id ?? recordId();
      ids.push(id);
      const principalData = { tipo_alta: "principal", numero_cupo_publico: slot, version_formulario: version.id, respuestas: person.respuestas, ...(options.presencial ? { acreditado: true, acreditado_en: new Date().toISOString(), acreditado_por: options.adminId ?? "", origen: "presencial" } : {}) };
      if (!existing) batch.collection("inscripciones").create({ id, evento: eventId, modalidad: mode.id, nombres: person.nombres, apellidos: person.apellidos, documento: person.documento, documento_normalizado: document, email: person.email, origen: options.presencial ? "presencial" : "publica", tipo_alta: "vinculada", numero_cupo_publico: 0, acreditado: false, ...(index === 0 ? principalData : {}) });
      else if (index === 0) batch.collection("inscripciones").update(id, principalData);
    }
    const exhibitionId = version.esquema.certificate === "grupo" || input.integrantes.length ? recordId() : "";
    if (exhibitionId) {
      batch.collection("exposiciones").create({ id: exhibitionId, evento: eventId, modalidad: mode.id, version: version.id, responsable: ids[0], respuestas: input.principal.respuestas });
      people.forEach((person, index) => {
        const role = index ? version.esquema.roles.find((r) => r.id === input.integrantes[index - 1].funcion)! : null;
        batch.collection("integrantes_exposicion").create({ exposicion: exhibitionId, participante: ids[index], funcion: role?.id ?? "principal", etiqueta: role?.label ?? version.esquema.principal, orden: index, respuestas: person.respuestas });
      });
    }
    batch.collection("operaciones_inscripcion").create({ evento: eventId, clave: input.operacion, huella: signature, participante: ids[0], exposicion: exhibitionId });
    if (options.adminId) batch.collection("auditoria").create({ administrador: options.adminId, accion: "inscripcion.presencial", entidad: "inscripcion", entidad_id: ids[0], datos: { evento: eventId, modalidad: mode.id } });
    await assertOwned();
    try { await batch.send(); }
    catch (error) { if (error instanceof ClientResponseError && [400, 403, 404].includes(error.status)) throw new DomainError("INVALID", "No se pudo confirmar la inscripción completa. Verificá los datos o consultá con la organización."); throw error; }
    return pb.collection("inscripciones").getOne<RegistrationRecord>(ids[0]);
  });
}

export async function eventExhibitions(eventId: string) {
  const pb = await createServicePocketBase();
  try {
    const exhibitions = await pb.collection("exposiciones").getFullList<Exhibition>({ filter: pb.filter("evento = {:id}", { id: eventId }) });
    const members = exhibitions.length ? await pb.collection("integrantes_exposicion").getFullList<ExhibitionMember>({ filter: exhibitions.map((g) => pb.filter("exposicion = {:id}", { id: g.id })).join(" || "), sort: "orden" }) : [];
    return { exhibitions, members };
  } catch (e) { if (e instanceof ClientResponseError && e.status === 404) return { exhibitions: [], members: [] }; throw e; }
}
