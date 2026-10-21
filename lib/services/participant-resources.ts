import "server-only";

import type { RecordModel } from "pocketbase";
import type { ParticipantAccess } from "@/lib/certificates/public-access";
import type { EventRecord, RegistrationRecord } from "@/lib/domain/models";
import type { Material } from "@/lib/domain/materials";
import { participantCertificates } from "./modal-resources";
import { createServicePocketBase } from "@/lib/pocketbase/client";

export async function findAccreditedRegistrations(normalizedDocument: string): Promise<string[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection("inscripciones").getFullList({
    filter: pb.filter("documento_normalizado = {:document}", { document: normalizedDocument }),
  });
  const eligible: string[] = [];
  for (const record of records) {
    if (record.acreditado) { eligible.push(record.id); continue; }
    if (record.modalidad) {
      const event = await pb.collection("eventos").getOne<EventRecord>(record.evento);
      if ((await participantCertificates(pb, record as unknown as RegistrationRecord, event)).length) eligible.push(record.id);
    }
  }
  return eligible;
}

export async function getParticipantResources(access: ParticipantAccess) {
  const pb = await createServicePocketBase();
  const registrationIds = [...access.registrationIds];
  // Mantener vigentes las consultas realizadas antes de incorporar materiales.
  if (!registrationIds.length && access.certificateIds.length) {
    const certificates = await pb.collection("certificados").getFullList({
      filter: access.certificateIds.map((id) => `(${pb.filter("id = {:id}", { id })})`).join(" || "), fields: "id,inscripcion",
    });
    registrationIds.push(...certificates.filter((record) => access.certificateIds.includes(record.id)).map((record) => String(record.inscripcion)));
  }
  if (!registrationIds.length) return null;
  const registrations = await pb.collection("inscripciones").getFullList<RegistrationRecord & RecordModel>({
    filter: "(" + registrationIds.map((id) => `(${pb.filter("id = {:id}", { id })})`).join(" || ") + ")",
    expand: "evento", sort: "-created",
  });
  const eligible = registrations.filter((record) => registrationIds.includes(record.id) && (record.acreditado || record.modalidad) && record.expand?.evento);
  if (!eligible.length) return null;
  const events = await Promise.all(eligible.map(async (registration) => {
    const event = registration.expand!.evento as unknown as EventRecord;
    if (registration.modalidad) {
      const certificates = await participantCertificates(pb, registration, event);
      const materials = registration.acreditado ? await pb.collection("materiales_evento").getFullList<Material>({ filter: pb.filter("evento = {:eventId}", { eventId: registration.evento }), sort: "created", fields: "id,titulo,nombre_original,tamano" }) : [];
      return { eventId: registration.evento, title: event.titulo, date: event.inicio, certificateId: undefined, offersCertificate: certificates.length > 0, certificates, materials, accredited: registration.acreditado };
    }
    const [certificates, materials] = await Promise.all([
      pb.collection("certificados").getFullList({ filter: pb.filter("inscripcion = {:id} && evento = {:eventId}", { id: registration.id, eventId: registration.evento }), fields: "id" }),
      pb.collection("materiales_evento").getFullList<Material>({ filter: pb.filter("evento = {:eventId}", { eventId: registration.evento }), sort: "created", fields: "id,titulo,nombre_original,tamano" }),
    ]);
    return { eventId: registration.evento, title: event.titulo, date: event.inicio, certificateId: certificates[0]?.id, offersCertificate: event.certificado_asistencia !== "no", certificates: [], materials, accredited: registration.acreditado };
  }));
  const available = events.filter((event) => event.accredited || event.certificates.length > 0);
  if (!available.length) return null;
  return { participant: { nombres: eligible[0].nombres, apellidos: eligible[0].apellidos }, events: available };
}
