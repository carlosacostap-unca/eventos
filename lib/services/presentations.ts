import "server-only";
import type { RecordModel } from "pocketbase";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { DomainError } from "@/lib/domain/errors";
import { normalizeDocument, type EventRecord, type RegistrationRecord } from "@/lib/domain/models";
import { exhibitionTitle, SECOND_EXHIBITOR_ROLE, type Exhibition, type Modality } from "@/lib/domain/modalities";
import { presentationInfo, type PresentationInfo } from "@/lib/domain/presentations";
import { verifyRegistrationEdit } from "@/lib/registrations/public-edit-access";
import { registrationEditSnapshot, findEditableRegistration } from "./public-registration-edit";
import { modalityVersion } from "./modalities";
import { preparePresentation } from "./presentation-files";
import { withOperationLock } from "./operation-lock";
import { deadlinePassed } from "@/lib/domain/modality-deadlines";

export type PresentationWork = { id: string; title: string; revision: string; presentation?: PresentationInfo; closesAt?: string; closed?: boolean };

async function publicContext(eventId: string, document: string, token: string) {
  const access = await verifyRegistrationEdit(token, eventId, normalizeDocument(document));
  const pb = await createServicePocketBase();
  const event = await pb.collection("eventos").getOne<EventRecord>(eventId);
  if (event.estado !== "publicado") throw new DomainError("CLOSED", "La entrega de presentaciones no está disponible para este evento.");
  const registration = await pb.collection("inscripciones").getOne<RegistrationRecord>(access.registrationId);
  if (registration.evento !== eventId || registration.documento_normalizado !== access.document) throw new DomainError("UNAUTHORIZED", "Volvé a buscar tu DNI para consultar tus trabajos.");
  const snapshot = await registrationEditSnapshot(registration);
  if (snapshot.revision !== access.revision) throw new DomainError("INVALID", "Tus trabajos cambiaron. Volvé a buscar tu DNI para recuperar los datos actualizados.");
  const groups = [...snapshot.groups, ...snapshot.linkedGroups.filter((group) => snapshot.otherMemberships.some((link) => link.exposicion === group.id && link.funcion === SECOND_EXHIBITOR_ROLE))];
  const allowed: Exhibition[] = [];
  const modes = new Map<string, Modality>();
  for (const group of groups) {
    if (group.evento !== eventId) continue;
    const mode = await pb.collection("modalidades_inscripcion").getOne<Modality>(group.modalidad);
    modes.set(mode.id, mode);
    if (mode.evento === eventId && mode.codigo === "expositor") allowed.push(group);
  }
  return { pb, allowed, registration, modes };
}

export async function findPresentationWorks(eventId: string, document: string) {
  const registration = await findEditableRegistration(document, eventId);
  if (!registration) return { token: "", works: [] as PresentationWork[] };
  const { allowed, modes } = await publicContext(eventId, document, registration.token);
  const works = await Promise.all(allowed.map(async (group) => ({ id: group.id,
    title: exhibitionTitle((await modalityVersion(group.version)).esquema, group.respuestas),
    revision: presentationInfo(group)?.revision ?? "", presentation: presentationInfo(group),
    closesAt: modes.get(group.modalidad)?.presentaciones_hasta, closed: deadlinePassed(modes.get(group.modalidad)?.presentaciones_hasta),
  })));
  return { token: registration.token, works };
}

export async function uploadExhibitionPresentation(eventId: string, exhibitionId: string, document: string, token: string, expectedRevision: string, file: File) {
  // Autorizar antes de procesar el archivo y volver a leer bajo el bloqueo al guardar.
  const context = await publicContext(eventId, document, token);
  if (!context.allowed.some((group) => group.id === exhibitionId)) throw new DomainError("UNAUTHORIZED", "No podés entregar archivos para este trabajo.");
  const initialGroup = context.allowed.find((group) => group.id === exhibitionId)!;
  if (deadlinePassed(context.modes.get(initialGroup.modalidad)?.presentaciones_hasta)) throw new DomainError("CLOSED", "El plazo para entregar o reemplazar presentaciones ya terminó.");
  const prepared = await preparePresentation(file);
  return withOperationLock(context.pb, "evento:" + eventId, async (assertOwned) => {
    const { pb, allowed, registration, modes } = await publicContext(eventId, document, token);
    const current = allowed.find((group) => group.id === exhibitionId);
    if (!current) throw new DomainError("UNAUTHORIZED", "No podés entregar archivos para este trabajo.");
    const closesAt = modes.get(current.modalidad)?.presentaciones_hasta;
    if (deadlinePassed(closesAt)) throw new DomainError("CLOSED", "El plazo para entregar o reemplazar presentaciones ya terminó.");
    if (current.presentacion_huella === prepared.data.presentacion_huella && current.presentacion_nombre === prepared.data.presentacion_nombre) return presentationInfo(current)!;
    if ((presentationInfo(current)?.revision ?? "") !== expectedRevision) throw new DomainError("INVALID", "La presentación fue reemplazada desde tu consulta. Volvé a buscar tu DNI antes de subir otra versión.");
    const batch = pb.createBatch();
    batch.collection("exposiciones").update(exhibitionId, { presentacion_final: prepared.file, ...prepared.data });
    batch.collection("auditoria").create({ accion: "exposicion.presentacion", entidad: "exposicion", entidad_id: exhibitionId, datos: { evento: eventId, participante: registration.id, reemplazo: !!current.presentacion_final } });
    await assertOwned();
    if (deadlinePassed(closesAt)) throw new DomainError("CLOSED", "El plazo para entregar o reemplazar presentaciones ya terminó.");
    await batch.send();
    return { filename: prepared.data.presentacion_nombre, size: prepared.data.presentacion_tamano,
      format: prepared.data.presentacion_formato, uploadedAt: prepared.data.presentacion_actualizada, revision: prepared.data.presentacion_huella };
  });
}

// El llamador administrativo debe autorizar el evento real del recurso antes de invocar.
export async function getPresentationDownload(exhibitionId: string, expectedEventId: string) {
  const pb = await createServicePocketBase();
  const group = await pb.collection("exposiciones").getOne<Exhibition & RecordModel>(exhibitionId);
  if (group.evento !== expectedEventId || !group.presentacion_final) throw new DomainError("NOT_FOUND", "La presentación no está disponible.");
  const info = presentationInfo(group)!;
  const token = await pb.files.getToken();
  const response = await fetch(pb.files.getURL(group, group.presentacion_final, { token }), { cache: "no-store" });
  if (!response.ok || !response.body) throw new DomainError("NOT_FOUND", "No se pudo recuperar la presentación.");
  return { body: response.body, ...info };
}
