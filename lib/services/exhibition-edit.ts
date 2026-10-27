import "server-only";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { coherentIdentity, parseSubmission, type Exhibition, type ExhibitionMember } from "@/lib/domain/modalities";
import { normalizeDocument, type RegistrationRecord } from "@/lib/domain/models";
import { DomainError } from "@/lib/domain/errors";
import { recordId } from "@/lib/domain/fingerprints";
import { modalityVersion } from "./modalities";
import { withOperationLock } from "./operation-lock";

export async function updateExhibition(eventId: string, exhibitionId: string, raw: unknown, adminId: string) {
  const pb = await createServicePocketBase();
  return withOperationLock(pb, "evento:" + eventId, async (assertOwned) => {
    const group = await pb.collection("exposiciones").getOne<Exhibition>(exhibitionId);
    if (group.evento !== eventId) throw new DomainError("NOT_FOUND", "La exposición no pertenece a este evento.");
    const version = await modalityVersion(group.version);
    const input = parseSubmission(version.esquema, raw);
    if (input.modalidad !== group.modalidad || input.version !== group.version) throw new DomainError("INVALID", "La modalidad o versión no coincide con la exposición.");
    const people = await pb.collection("inscripciones").getFullList<RegistrationRecord>({ filter: pb.filter("evento = {:id}", { id: eventId }) });
    const principal = people.find((p) => p.id === group.responsable)!;
    if (!coherentIdentity(principal, input.principal)) throw new DomainError("INVALID", "Corregí la identidad del alumno desde Acreditación; aquí se editan los integrantes y respuestas.");
    const previous = await pb.collection("integrantes_exposicion").getFullList<ExhibitionMember>({ filter: pb.filter("exposicion = {:id}", { id: exhibitionId }) });
    const batch = pb.createBatch();
    for (const link of previous) batch.collection("integrantes_exposicion").delete(link.id);
    const submitted = [{ ...input.principal, funcion: "principal" }, ...input.integrantes];
    submitted.forEach((person, i) => {
      const existing = people.find((p) => p.documento_normalizado === normalizeDocument(person.documento));
      if (existing && (existing.modalidad !== group.modalidad || !coherentIdentity(existing, person))) throw new DomainError("DUPLICATE", "Un integrante ya está registrado con otra modalidad o identidad. Corregí sus datos desde Acreditación.");
      const id = existing?.id ?? recordId();
      if (!existing) batch.collection("inscripciones").create({ id, evento: eventId, modalidad: group.modalidad, tipo_alta: "vinculada", origen: principal.origen, numero_cupo_publico: 0, acreditado: false, nombres: person.nombres, apellidos: person.apellidos, email: person.email, documento: person.documento, documento_normalizado: normalizeDocument(person.documento) });
      const role = version.esquema.roles.find((r) => r.id === person.funcion);
      batch.collection("integrantes_exposicion").create({ exposicion: exhibitionId, participante: id, funcion: person.funcion, etiqueta: role?.label ?? version.esquema.principal, orden: i, respuestas: person.respuestas });
    });
    batch.collection("exposiciones").update(exhibitionId, { respuestas: input.principal.respuestas });
    const owned = await pb.collection("exposiciones").getFullList<Exhibition>({ filter: pb.filter("evento = {:event} && responsable = {:id}", { event: eventId, id: principal.id }) });
    if (owned.length === 1) batch.collection("inscripciones").update(principal.id, { respuestas: input.principal.respuestas });
    batch.collection("auditoria").create({ administrador: adminId, accion: "exposicion.editada", entidad: "exposicion", entidad_id: exhibitionId, datos: { evento: eventId, campos: ["integrantes", "respuestas"] } });
    await assertOwned();
    await batch.send();
  });
}
