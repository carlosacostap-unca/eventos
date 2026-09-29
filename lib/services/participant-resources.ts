import "server-only";

import type { RecordModel } from "pocketbase";
import type { ParticipantAccess } from "@/lib/certificates/public-access";
import type { EventRecord, RegistrationRecord } from "@/lib/domain/models";
import type { Material } from "@/lib/domain/materials";
import { createServicePocketBase } from "@/lib/pocketbase/client";

export async function findAccreditedRegistrations(normalizedDocument: string): Promise<string[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection("inscripciones").getFullList({
    filter: pb.filter("documento_normalizado = {:document} && acreditado = true", { document: normalizedDocument }), fields: "id",
  });
  return records.map((record) => record.id);
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
    filter: "(" + registrationIds.map((id) => `(${pb.filter("id = {:id}", { id })})`).join(" || ") + ") && acreditado = true",
    expand: "evento", sort: "-created",
  });
  const eligible = registrations.filter((record) => registrationIds.includes(record.id) && record.acreditado && record.expand?.evento);
  if (!eligible.length) return null;
  const events = await Promise.all(eligible.map(async (registration) => {
    const event = registration.expand!.evento as unknown as EventRecord;
    const [certificates, materials] = await Promise.all([
      pb.collection("certificados").getFullList({ filter: pb.filter("inscripcion = {:id} && evento = {:eventId}", { id: registration.id, eventId: registration.evento }), fields: "id" }),
      pb.collection("materiales_evento").getFullList<Material>({ filter: pb.filter("evento = {:eventId}", { eventId: registration.evento }), sort: "created", fields: "id,titulo,nombre_original,tamano" }),
    ]);
    return { eventId: registration.evento, title: event.titulo, date: event.inicio, certificateId: certificates[0]?.id, offersCertificate: event.certificado_asistencia !== "no", materials };
  }));
  return { participant: { nombres: eligible[0].nombres, apellidos: eligible[0].apellidos }, events };
}
