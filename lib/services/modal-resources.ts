import "server-only";
import type PocketBase from "pocketbase";
import type { CertificateRecord, EventRecord, RegistrationRecord } from "@/lib/domain/models";
import type { Exhibition, ExhibitionMember } from "@/lib/domain/modalities";
import { certificateSubject, canDownloadModalCertificate } from "./certificate-subjects";

export async function participantCertificates(pb: PocketBase, participant: RegistrationRecord, event: EventRecord) {
  const links = await pb.collection("integrantes_exposicion").getFullList<ExhibitionMember>({ filter: pb.filter("participante = {:id}", { id: participant.id }) });
  const result: Array<{ id?: string; label: string; stale: boolean; eligible: boolean }> = [];
  const subjects: RegistrationRecord[] = [];
  for (const link of links) {
    const group = await pb.collection("exposiciones").getOne<Exhibition>(link.exposicion);
    if (group.evento !== event.id) continue;
    subjects.push(await pb.collection("inscripciones").getOne<RegistrationRecord>(group.responsable));
  }
  if (participant.tipo_alta !== "vinculada" && !subjects.some((p) => p.id === participant.id)) subjects.push(participant);
  for (const principal of [...new Map(subjects.map((p) => [p.id, p])).values()]) {
    const subject = await certificateSubject(pb, event, principal);
    if (!subject?.eligible || !subject.members.some((m) => m.person.id === participant.id)) continue;
    const records = await pb.collection("certificados").getFullList<CertificateRecord>({ filter: pb.filter("inscripcion = {:id} && evento = {:event}", { id: principal.id, event: event.id }) });
    const certificate = records[0];
    const stale = !!certificate?.huella && certificate.huella !== subject.hash;
    const permitted = certificate ? await canDownloadModalCertificate(pb, certificate, [participant.id]) : false;
    result.push({ id: permitted ? certificate?.id : undefined, label: subject.exhibition ? `Exposición de ${principal.apellidos}, ${principal.nombres}` : subject.mode.nombre, stale, eligible: true });
  }
  return result;
}
