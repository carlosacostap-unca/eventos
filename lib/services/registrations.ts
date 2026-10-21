import "server-only";

import { ClientResponseError, type RecordModel } from "pocketbase";

import { DomainError } from "@/lib/domain/errors";
import { getRegistrationAvailability, nextPublicSlot } from "@/lib/domain/events";
import {
  normalizeDocument,
  registrationInputSchema,
  type EventRecord,
  type RegistrationInput,
  type RegistrationRecord,
} from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { audit } from "@/lib/services/audit";
import { getEventById } from "@/lib/services/events";
import { listModalities, modalityVersion } from "./modalities";
import { registerWithModality, eventExhibitions } from "./modal-registration";
import { withOperationLock } from "./operation-lock";
import { parseAnswers, type Answers } from "@/lib/domain/modalities";
import { randomUUID } from "node:crypto";

function toRegistration(record: RecordModel): RegistrationRecord {
  return record as unknown as RegistrationRecord;
}

export async function countPublicRegistrations(eventId: string): Promise<number> {
  const pb = await createServicePocketBase();
  const result = await pb.collection("inscripciones").getList(1, 1, {
    filter: pb.filter('evento = {:eventId} && origen = "publica" && numero_cupo_publico > 0', { eventId }),
    fields: "id",
  });
  return result.totalItems;
}

async function existingByDocument(eventId: string, document: string) {
  const pb = await createServicePocketBase();
  try {
    return toRegistration(
      await pb
        .collection("inscripciones")
        .getFirstListItem(
          pb.filter(
            "evento = {:eventId} && documento_normalizado = {:documento}",
            { eventId, documento: document },
          ),
        ),
    );
  } catch {
    return null;
  }
}

async function usedPublicSlots(eventId: string): Promise<number[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection("inscripciones").getFullList({
    filter: pb.filter(
      'evento = {:eventId} && origen = "publica" && numero_cupo_publico > 0',
      { eventId },
    ),
    sort: "-numero_cupo_publico",
    fields: "numero_cupo_publico",
  });
  return records.map((item) => Number(item.numero_cupo_publico));
}

export async function registerPublic(
  event: EventRecord,
  input: RegistrationInput,
): Promise<RegistrationRecord> {
  const modes = await listModalities(event.id);
  if (modes.length) {
    const mode = modes.find((m) => m.codigo === "asistente" && m.habilitada);
    if (!mode || modes.length > 1) throw new DomainError("INVALID", "Elegí una modalidad en el formulario del evento.");
    return registerWithModality(event.id, { modalidad: mode.id, version: mode.version_publicada, operacion: randomUUID(), principal: { ...input, respuestas: {} }, integrantes: [] });
  }
  const normalizedDocument = normalizeDocument(input.documento);
  if (await existingByDocument(event.id, normalizedDocument)) {
    throw new DomainError("DUPLICATE", "Ya existe una inscripción con ese documento.");
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const publicCount = await countPublicRegistrations(event.id);
    const availability = getRegistrationAvailability(event, publicCount);
    if (availability === "completo") {
      throw new DomainError("FULL", "El cupo del evento está completo.");
    }
    if (availability !== "disponible") {
      throw new DomainError("CLOSED", "La inscripción no está disponible.");
    }

    const slot = nextPublicSlot(await usedPublicSlots(event.id), event.cupo);
    if (!slot) throw new DomainError("FULL", "El cupo del evento está completo.");

    const pb = await createServicePocketBase();
    try {
      return toRegistration(
        await pb.collection("inscripciones").create({
          evento: event.id,
          nombres: input.nombres,
          apellidos: input.apellidos,
          email: input.email,
          documento: input.documento,
          documento_normalizado: normalizedDocument,
          origen: "publica",
          numero_cupo_publico: slot,
          acreditado: false,
        }),
      );
    } catch (error) {
      if (!(error instanceof ClientResponseError) || error.status !== 400) throw error;
      if (await existingByDocument(event.id, normalizedDocument)) {
        throw new DomainError("DUPLICATE", "Ya existe una inscripción con ese documento.");
      }
    }
  }

  throw new DomainError(
    "FULL",
    "No pudimos reservar el lugar. Intentá nuevamente en unos segundos.",
  );
}

export type RegistrationFilters = {
  modality?: string;
  role?: string;
  query?: string;
  source?: "publica" | "presencial";
  attendance?: "acreditado" | "ausente";
};

export type RegistrationPage = {
  items: RegistrationRecord[];
  page: number;
  totalPages: number;
  totalItems: number;
};

function registrationFilter(
  pb: Awaited<ReturnType<typeof createServicePocketBase>>,
  eventId: string,
  filters: RegistrationFilters,
) {
  const clauses = [pb.filter("evento = {:eventId}", { eventId })];
  if (filters.modality) clauses.push(pb.filter("modalidad = {:modality}", { modality: filters.modality }));
  if (filters.query) {
    clauses.push(
      pb.filter(
        "(nombres ~ {:query} || apellidos ~ {:query} || email ~ {:query} || documento ~ {:query})",
        { query: filters.query },
      ),
    );
  }
  if (filters.source) {
    clauses.push(pb.filter("origen = {:source}", { source: filters.source }));
  }
  if (filters.attendance) {
    clauses.push(
      "acreditado = " +
        (filters.attendance === "acreditado" ? "true" : "false"),
    );
  }
  return clauses.join(" && ");
}

export async function listRegistrationsPage(
  eventId: string,
  filters: RegistrationFilters = {},
  page = 1,
  perPage = 50,
): Promise<RegistrationPage> {
  const pb = await createServicePocketBase();
  if (filters.role) {
    const items = await listRegistrations(eventId, filters);
    return { items: items.slice((page - 1) * perPage, page * perPage), page, totalPages: Math.ceil(items.length / perPage), totalItems: items.length };
  }
  const result = await pb.collection("inscripciones").getList(page, perPage, {
    filter: registrationFilter(pb, eventId, filters),
    sort: "apellidos,nombres",
  });
  return {
    items: result.items.map(toRegistration),
    page: result.page,
    totalPages: result.totalPages,
    totalItems: result.totalItems,
  };
}

export async function listRegistrations(
  eventId: string,
  filters: RegistrationFilters = {},
): Promise<RegistrationRecord[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection("inscripciones").getFullList({
    filter: registrationFilter(pb, eventId, filters),
    sort: "apellidos,nombres",
  });
  let items = records.map(toRegistration);
  if (filters.role) {
    const { members } = await eventExhibitions(eventId);
    const ids = new Set(members.filter((m) => m.funcion === filters.role).map((m) => m.participante));
    items = items.filter((p) => ids.has(p.id));
  }
  return items;
}

export async function setAttendance(
  registrationId: string,
  accredited: boolean,
  adminId: string,
  expectedEventId?: string,
): Promise<RegistrationRecord> {
  const pb = await createServicePocketBase();
  const current = toRegistration(
    await pb.collection("inscripciones").getOne(registrationId),
  );
  if (expectedEventId && current.evento !== expectedEventId) throw new DomainError("NOT_FOUND", "La inscripción no pertenece a este evento.");
  if (current.modalidad) return withOperationLock(pb, "evento:" + current.evento, async (assertOwned) => {
    const fresh = toRegistration(await pb.collection("inscripciones").getOne(registrationId));
    if (fresh.acreditado === accredited) return fresh;
    await assertOwned();
    const updated = toRegistration(await pb.collection("inscripciones").update(registrationId, { acreditado: accredited, acreditado_en: accredited ? new Date().toISOString() : "", acreditado_por: accredited ? adminId : "" }));
    await audit({ adminId, action: accredited ? "asistencia.acreditada" : "asistencia.revocada", entity: "inscripcion", entityId: registrationId });
    return updated;
  });
  if (current.acreditado === accredited) return current;

  const updated = toRegistration(
    await pb.collection("inscripciones").update(registrationId, {
      acreditado: accredited,
      acreditado_en: accredited ? new Date().toISOString() : "",
      acreditado_por: accredited ? adminId : "",
    }),
  );
  await audit({
    adminId,
    action: accredited ? "asistencia.acreditada" : "asistencia.revocada",
    entity: "inscripcion",
    entityId: registrationId,
  });
  return updated;
}

export async function updateRegistration(
  eventId: string,
  registrationId: string,
  input: RegistrationInput & { respuestas?: Answers },
  adminId: string,
): Promise<RegistrationRecord> {
  const parsed = registrationInputSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("INVALID", "Revisá los datos ingresados.");
  const pb = await createServicePocketBase();
  const collection = pb.collection("inscripciones");
  const current = toRegistration(await collection.getOne(registrationId));
  if (current.evento !== eventId) {
    throw new DomainError("NOT_FOUND", "La inscripción no pertenece a este evento.");
  }
  if (current.modalidad) return withOperationLock(pb, "evento:" + eventId, async (assertOwned) => {
    const duplicates = await collection.getList(1, 1, { filter: pb.filter("evento = {:eventId} && documento_normalizado = {:doc} && id != {:id}", { eventId, doc: normalizeDocument(parsed.data.documento), id: registrationId }), fields: "id" });
    if (duplicates.totalItems) throw new DomainError("DUPLICATE", "Ya existe otra inscripción con ese DNI en el evento.");
    const extra = input.respuestas && current.version_formulario ? { respuestas: parseAnswers((await modalityVersion(current.version_formulario)).esquema.fields, input.respuestas) } : {};
    await assertOwned();
    const data = { ...parsed.data, ...extra, documento_normalizado: normalizeDocument(parsed.data.documento) };
    let updated: RegistrationRecord;
    if (extra.respuestas) {
      const groups = await pb.collection("exposiciones").getFullList({ filter: pb.filter("evento = {:eventId} && responsable = {:id}", { eventId, id: registrationId }) });
      const batch = pb.createBatch();
      batch.collection("inscripciones").update(registrationId, data);
      for (const group of groups) {
        batch.collection("exposiciones").update(group.id, { respuestas: extra.respuestas });
        const links = await pb.collection("integrantes_exposicion").getFullList({ filter: pb.filter('exposicion = {:group} && participante = {:id} && funcion = "principal"', { group: group.id, id: registrationId }) });
        for (const link of links) batch.collection("integrantes_exposicion").update(link.id, { respuestas: extra.respuestas });
      }
      await assertOwned();
      await batch.send();
      updated = toRegistration(await collection.getOne(registrationId));
    } else updated = toRegistration(await collection.update(registrationId, data));
    await audit({ adminId, action: "inscripcion.editada", entity: "inscripcion", entityId: registrationId, data: { evento: eventId, campos: [...Object.keys(parsed.data).filter((key) => current[key as keyof RegistrationInput] !== parsed.data[key as keyof RegistrationInput]), ...Object.keys(extra)] } });
    return updated;
  });
  const data = {
    ...parsed.data,
    documento_normalizado: normalizeDocument(parsed.data.documento),
  };
  const duplicates = await collection.getList(1, 1, {
    filter: pb.filter(
      "evento = {:eventId} && documento_normalizado = {:documento} && id != {:registrationId}",
      { eventId, documento: data.documento_normalizado, registrationId },
    ),
    fields: "id",
  });
  if (duplicates.totalItems > 0) {
    throw new DomainError("DUPLICATE", "Ya existe otra inscripción con ese documento en este evento.");
  }
  let updated: RegistrationRecord;
  try {
    updated = toRegistration(await collection.update(registrationId, data));
  } catch (error) {
    if (error instanceof ClientResponseError &&
        error.response?.data?.documento_normalizado?.code === "validation_not_unique") {
      throw new DomainError("DUPLICATE", "Ya existe otra inscripción con ese documento en este evento.");
    }
    throw error;
  }
  await audit({
    adminId,
    action: "inscripcion.editada",
    entity: "inscripcion",
    entityId: registrationId,
    data: { evento: eventId, campos: Object.keys(parsed.data).filter(
      (key) => current[key as keyof RegistrationInput] !== parsed.data[key as keyof RegistrationInput],
    ) },
  });
  return updated;
}

export async function createWalkIn(
  eventId: string,
  input: RegistrationInput,
  adminId: string,
  allowOverCapacity = false,
): Promise<RegistrationRecord> {
  const event = await getEventById(eventId);
  if (!event) throw new DomainError("NOT_FOUND", "El evento no existe.");
  const modes = await listModalities(eventId);
  if (modes.length) {
    const mode = modes.find((m) => m.codigo === "asistente" && m.habilitada);
    if (!mode || modes.length > 1) throw new DomainError("INVALID", "Elegí la modalidad de participación antes del alta.");
    return registerWithModality(eventId, { modalidad: mode.id, version: mode.version_publicada, operacion: randomUUID(), principal: { ...input, respuestas: {} }, integrantes: [] }, { presencial: true, allowOverCapacity, adminId });
  }
  const normalizedDocument = normalizeDocument(input.documento);
  const duplicate = await existingByDocument(eventId, normalizedDocument);
  if (duplicate) throw new DomainError("DUPLICATE", "La persona ya figura en el evento.");

  const publicCount = await countPublicRegistrations(eventId);
  if (publicCount >= event.cupo && !allowOverCapacity) {
    throw new DomainError(
      "CONFIRMATION_REQUIRED",
      "Confirmá que querés superar el cupo público.",
    );
  }
  const pb = await createServicePocketBase();
  const registration = toRegistration(
    await pb.collection("inscripciones").create({
      evento: eventId,
      nombres: input.nombres,
      apellidos: input.apellidos,
      email: input.email,
      documento: input.documento,
      documento_normalizado: normalizedDocument,
      origen: "presencial",
      numero_cupo_publico: 0,
      acreditado: true,
      acreditado_en: new Date().toISOString(),
      acreditado_por: adminId,
    }),
  );

  await audit({
    adminId,
    action: "inscripcion.presencial",
    entity: "inscripcion",
    entityId: registration.id,
    data: { excedeCupo: publicCount >= event.cupo, evento: eventId },
  });
  return registration;
}
