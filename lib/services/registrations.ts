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

function toRegistration(record: RecordModel): RegistrationRecord {
  return record as unknown as RegistrationRecord;
}

export async function countPublicRegistrations(eventId: string): Promise<number> {
  const pb = await createServicePocketBase();
  const result = await pb.collection("inscripciones").getList(1, 1, {
    filter: pb.filter('evento = {:eventId} && origen = "publica"', { eventId }),
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
  return records.map(toRegistration);
}

export async function setAttendance(
  registrationId: string,
  accredited: boolean,
  adminId: string,
): Promise<RegistrationRecord> {
  const pb = await createServicePocketBase();
  const current = toRegistration(
    await pb.collection("inscripciones").getOne(registrationId),
  );
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
  input: RegistrationInput,
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
