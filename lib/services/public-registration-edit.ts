import "server-only";
import type PocketBase from "pocketbase";
import { fingerprint } from "@/lib/domain/fingerprints";
import { normalizeDocument, registrationInputSchema, type RegistrationRecord } from "@/lib/domain/models";
import { DomainError } from "@/lib/domain/errors";
import { getRegistrationAvailability } from "@/lib/domain/events";
import type { RegistrationInput, EventRecord } from "@/lib/domain/models";
import type { EditableRegistration } from "@/lib/domain/registration-prefill";
import type { Exhibition, ExhibitionMember } from "@/lib/domain/modalities";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { signRegistrationEdit, verifyRegistrationEdit } from "@/lib/registrations/public-edit-access";
import { modalityVersion } from "./modalities";
import { withOperationLock } from "./operation-lock";

export async function registrationEditSnapshot(registration: RegistrationRecord) {
  const pb = await createServicePocketBase();
  const groups = registration.modalidad ? await pb.collection("exposiciones").getFullList<Exhibition>({
    filter: pb.filter("evento = {:event} && responsable = {:id}", { event: registration.evento, id: registration.id }),
  }) : [];
  const membershipFilters = [pb.filter("participante = {:id}", { id: registration.id }), ...groups.map((g) => pb.filter("exposicion = {:id}", { id: g.id }))];
  const members = registration.modalidad ? await pb.collection("integrantes_exposicion").getFullList<ExhibitionMember>({ filter: membershipFilters.join(" || ") }) : [];
  const links = members.filter((m) => groups.some((g) => g.id === m.exposicion));
  const otherMemberships = members.filter((m) => m.participante === registration.id && !groups.some((g) => g.id === m.exposicion));
  const linkedGroups = await Promise.all([...new Set(otherMemberships.map((m) => m.exposicion))].map((id) => pb.collection("exposiciones").getOne<Exhibition>(id)));
  const { nombres, apellidos, documento, email, modalidad, version_formulario, respuestas, tipo_alta } = registration;
  const revision = fingerprint({ nombres, apellidos, documento, email, modalidad, version_formulario, respuestas, tipo_alta,
    groups: [...groups].sort((a, b) => a.id.localeCompare(b.id)), links: [...links].sort((a, b) => a.id.localeCompare(b.id)),
    otherMemberships: [...otherMemberships].sort((a, b) => a.id.localeCompare(b.id)), linkedGroups: [...linkedGroups].sort((a, b) => a.id.localeCompare(b.id)) });
  return { groups, links, revision, otherMemberships, linkedGroups };
}

export async function findEditableRegistration(document: string, eventId: string): Promise<EditableRegistration | undefined> {
  const pb: PocketBase = await createServicePocketBase();
  const result = await pb.collection("inscripciones").getList<RegistrationRecord>(1, 1, {
    filter: pb.filter("evento = {:eventId} && documento_normalizado = {:document}", { eventId, document: normalizeDocument(document) }),
  });
  const registration = result.items[0];
  if (!registration) return;
  const snapshot = await registrationEditSnapshot(registration);
  // Los datos de otros eventos nunca se incluyen en la edición.
  const integrantes: EditableRegistration["integrantes"] = [];
  for (const link of snapshot.links.filter((m) => m.funcion !== "principal").sort((a, b) => a.orden - b.orden)) {
    const member = await pb.collection("inscripciones").getOne<RegistrationRecord>(link.participante);
    if (member.evento !== eventId) continue;
    integrantes.push({ ...registrationInputSchema.parse(member), funcion: link.funcion, respuestas: link.respuestas ?? {} });
  }
  const participations: NonNullable<EditableRegistration["participations"]> = [];
  for (const link of snapshot.otherMemberships) {
    const group = snapshot.linkedGroups.find((g) => g.id === link.exposicion && g.evento === eventId);
    if (!group) continue;
    const principal = await pb.collection("inscripciones").getOne<RegistrationRecord>(group.responsable);
    if (principal.evento !== eventId) continue;
    const version = await modalityVersion(group.version);
    const titleField = version.esquema.fields.find((field) => field.id === "titulo_trabajo") ?? version.esquema.fields.find((field) => field.type === "text" && /título/i.test(field.label));
    participations.push({ title: titleField ? String(group.respuestas?.[titleField.id] ?? "Exposición sin título") : "Exposición", principalName: principal.apellidos + ", " + principal.nombres, role: link.etiqueta });
  }
  return {
    token: await signRegistrationEdit({ eventId, registrationId: registration.id, document: normalizeDocument(document), revision: snapshot.revision }),
    modalidad: registration.modalidad ?? "legacy", version: registration.version_formulario ?? "legacy",
    ...(registration.version_formulario ? { definition: (await modalityVersion(registration.version_formulario)).esquema } : {}),
    principal: { ...registrationInputSchema.parse(registration), respuestas: registration.respuestas ?? {} }, integrantes,
    ...(participations.length ? { participations, linked: registration.tipo_alta === "vinculada" && !snapshot.groups.length } : {}),
  };
}

export async function updatePublicLinkedRegistration(eventId: string, raw: RegistrationInput, editToken: string): Promise<RegistrationRecord> {
  const input = registrationInputSchema.parse(raw);
  const access = await verifyRegistrationEdit(editToken, eventId, normalizeDocument(input.documento));
  const pb = await createServicePocketBase();
  return withOperationLock(pb, "evento:" + eventId, async (assertOwned) => {
    const event = await pb.collection("eventos").getOne<EventRecord>(eventId);
    if (getRegistrationAvailability(event, 0) !== "disponible") throw new DomainError("CLOSED", "La inscripción no está disponible.");
    const current = await pb.collection("inscripciones").getOne<RegistrationRecord>(access.registrationId);
    if (current.evento !== eventId || current.documento_normalizado !== access.document || current.tipo_alta !== "vinculada") throw new DomainError("INVALID", "Volvé a buscar tu DNI para consultar tu inscripción actual.");
    const snapshot = await registrationEditSnapshot(current);
    if (snapshot.revision !== access.revision || snapshot.groups.length || !snapshot.otherMemberships.length || snapshot.linkedGroups.some((g) => g.evento !== eventId)) throw new DomainError("INVALID", "Tu inscripción o exposición cambió. Volvé a buscar tu DNI para recuperar los datos actualizados.");
    await assertOwned();
    return pb.collection("inscripciones").update<RegistrationRecord>(current.id, { ...input, documento_normalizado: access.document });
  });
}
