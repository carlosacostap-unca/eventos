import "server-only";
import type PocketBase from "pocketbase";
import type { CertificateRecord, EventRecord, RegistrationRecord } from "@/lib/domain/models";
import { exhibitionTitle, type Exhibition, type ExhibitionMember } from "@/lib/domain/modalities";
import { certificateSubject, canDownloadModalCertificate } from "./certificate-subjects";
import { modalityVersion } from "./modalities";

export async function participantCertificates(pb: PocketBase, participant: RegistrationRecord, event: EventRecord) {
  const links = await pb.collection("integrantes_exposicion").getFullList<ExhibitionMember>({ filter: pb.filter("participante = {:id}", { id: participant.id }) });
  const result: Array<{ id?: string; label: string; stale: boolean; eligible: boolean }> = [];
  const subjects: Array<{ principal: RegistrationRecord; exhibitionId?: string }> = [];
  for (const link of links) {
    const group = await pb.collection("exposiciones").getOne<Exhibition>(link.exposicion);
    if (group.evento !== event.id) continue;
    const version = await modalityVersion(group.version);
    subjects.push({ principal: await pb.collection("inscripciones").getOne<RegistrationRecord>(group.responsable), exhibitionId: version.esquema.certificate === "grupo" ? group.id : undefined });
  }
  if (participant.tipo_alta !== "vinculada" && !subjects.some((p) => p.principal.id === participant.id)) subjects.push({ principal: participant });
  for (const { principal, exhibitionId } of [...new Map(subjects.map((p) => [p.exhibitionId ?? p.principal.id, p])).values()]) {
    const subject = await certificateSubject(pb, event, principal, exhibitionId);
    if (!subject?.eligible || !subject.members.some((m) => m.person.id === participant.id)) continue;
    const records = await pb.collection("certificados").getFullList<CertificateRecord>({ filter: pb.filter("inscripcion = {:id} && evento = {:event} && exposicion = {:group}", { id: principal.id, event: event.id, group: subject.exhibition?.id ?? "" }) });
    const certificate = records[0];
    const stale = !!certificate?.huella && certificate.huella !== subject.hash;
    const permitted = certificate ? await canDownloadModalCertificate(pb, certificate, [participant.id]) : false;
    const title = subject.exhibition ? exhibitionTitle((await modalityVersion(subject.exhibition.version)).esquema, subject.exhibition.respuestas) : undefined;
    result.push({ id: permitted ? certificate?.id : undefined, label: title ?? subject.mode.nombre, stale, eligible: true });
  }
  return result;
}
