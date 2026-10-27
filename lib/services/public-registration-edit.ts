import "server-only";
import type PocketBase from "pocketbase";
import { fingerprint } from "@/lib/domain/fingerprints";
import { normalizeDocument, registrationInputSchema, type RegistrationRecord } from "@/lib/domain/models";
import type { EditableRegistration } from "@/lib/domain/registration-prefill";
import type { Exhibition, ExhibitionMember } from "@/lib/domain/modalities";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { signRegistrationEdit } from "@/lib/registrations/public-edit-access";
import { modalityVersion } from "./modalities";

export async function registrationEditSnapshot(registration: RegistrationRecord) {
  const pb = await createServicePocketBase();
  const groups = registration.modalidad ? await pb.collection("exposiciones").getFullList<Exhibition>({
    filter: pb.filter("evento = {:event} && responsable = {:id}", { event: registration.evento, id: registration.id }),
  }) : [];
  const membershipFilters = [pb.filter("participante = {:id}", { id: registration.id }), ...groups.map((g) => pb.filter("exposicion = {:id}", { id: g.id }))];
  const members = registration.modalidad ? await pb.collection("integrantes_exposicion").getFullList<ExhibitionMember>({ filter: membershipFilters.join(" || ") }) : [];
  const links = members.filter((m) => groups.some((g) => g.id === m.exposicion));
  const { nombres, apellidos, documento, email, modalidad, version_formulario, respuestas, tipo_alta } = registration;
  const revision = fingerprint({ nombres, apellidos, documento, email, modalidad, version_formulario, respuestas, tipo_alta,
    groups: [...groups].sort((a, b) => a.id.localeCompare(b.id)), links: [...links].sort((a, b) => a.id.localeCompare(b.id)) });
  return { groups, links, revision, otherMemberships: members.filter((m) => m.participante === registration.id && !groups.some((g) => g.id === m.exposicion)) };
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
  return {
    token: await signRegistrationEdit({ eventId, registrationId: registration.id, document: normalizeDocument(document), revision: snapshot.revision }),
    modalidad: registration.modalidad ?? "legacy", version: registration.version_formulario ?? "legacy",
    ...(registration.version_formulario ? { definition: (await modalityVersion(registration.version_formulario)).esquema } : {}),
    principal: { ...registrationInputSchema.parse(registration), respuestas: registration.respuestas ?? {} }, integrantes,
  };
}
