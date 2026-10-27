import "server-only";
import { ClientResponseError } from "pocketbase";
import { accreditationDocumentSchema, type AccreditationPerson } from "@/lib/domain/accreditation";
import { DomainError } from "@/lib/domain/errors";
import { normalizeDocument, registrationInputSchema, type RegistrationInput, type RegistrationRecord } from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { withOperationLock } from "./operation-lock";
import { audit } from "./audit";

export async function findAccreditationPerson(eventId: string, document: string): Promise<AccreditationPerson | null> {
  const normalized = accreditationDocumentSchema.parse(document);
  const pb = await createServicePocketBase();
  try {
    return await pb.collection("inscripciones").getFirstListItem<AccreditationPerson>(
      pb.filter("evento = {:eventId} && documento_normalizado = {:document}", { eventId, document: normalized }),
      { fields: "id,nombres,apellidos,documento,email,acreditado,acreditado_en" },
    );
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) return null;
    throw error;
  }
}

// La corrección personal y la asistencia se guardan juntas. Nunca modifica modalidad,
// respuestas de trabajos, integrantes, origen ni cupos de la inscripción existente.
export async function confirmAccreditation(eventId: string, registrationId: string, input: RegistrationInput, adminId: string) {
  const parsed = registrationInputSchema.parse(input);
  const pb = await createServicePocketBase();
  return withOperationLock(pb, "evento:" + eventId, async (assertOwned) => {
    const collection = pb.collection("inscripciones");
    const current = await collection.getOne<RegistrationRecord>(registrationId);
    if (current.evento !== eventId) throw new DomainError("NOT_FOUND", "La inscripción no pertenece a este evento.");
    const document = normalizeDocument(parsed.documento);
    const duplicates = await collection.getList(1, 1, {
      filter: pb.filter("evento = {:eventId} && documento_normalizado = {:document} && id != {:id}", { eventId, document, id: registrationId }),
      fields: "id",
    });
    if (duplicates.totalItems) throw new DomainError("DUPLICATE", "Ya existe otra inscripción con ese DNI. Volvé a buscarlo.");
    const changed = (Object.keys(parsed) as Array<keyof RegistrationInput>).filter((key) => current[key] !== parsed[key]);
    if (current.acreditado && !changed.length) return;
    await assertOwned();
    try {
      await collection.update(registrationId, {
        ...parsed, documento_normalizado: document, acreditado: true,
        ...(!current.acreditado ? { acreditado_en: new Date().toISOString(), acreditado_por: adminId } : {}),
      });
    } catch (error) {
      if (error instanceof ClientResponseError && error.response?.data?.documento_normalizado?.code === "validation_not_unique") {
        throw new DomainError("DUPLICATE", "Ya existe otra inscripción con ese DNI. Volvé a buscarlo.");
      }
      throw error;
    }
    await audit({ adminId, action: current.acreditado ? "inscripcion.editada" : "asistencia.acreditada", entity: "inscripcion", entityId: registrationId, data: { evento: eventId, campos: changed } });
  });
}
