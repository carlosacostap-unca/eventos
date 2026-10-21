import "server-only";
import type PocketBase from "pocketbase";
import type { CertificateRecord, EventRecord, RegistrationRecord } from "@/lib/domain/models";
import type { Modality, Exhibition, ExhibitionMember } from "@/lib/domain/modalities";
import { fingerprint } from "@/lib/domain/fingerprints";
import { modalityVersion } from "./modalities";

export type CertificateSubject = { mode: Modality; event: EventRecord; registration: RegistrationRecord; exhibition?: Exhibition; members: Array<{ person: RegistrationRecord; role: string; functionId: string }>; hash: string; eligible: boolean; };
export async function certificateSubject(pb: PocketBase, event: EventRecord, registration: RegistrationRecord): Promise<CertificateSubject | null> {
  if (!registration.modalidad || registration.tipo_alta === "vinculada") return null;
  const mode = await pb.collection("modalidades_inscripcion").getOne<Modality>(registration.modalidad);
  if (mode.evento !== event.id || registration.evento !== event.id) return null;
  const version = await modalityVersion(registration.version_formulario || mode.version_publicada);
  if (version.modalidad !== mode.id) return null;
  let exhibition: Exhibition | undefined;
  let members: CertificateSubject["members"] = [{ person: registration, role: version.esquema.principal, functionId: "principal" }];
  if (version.esquema.certificate === "grupo") {
    const groups = await pb.collection("exposiciones").getFullList<Exhibition>({ filter: pb.filter("evento = {:event} && responsable = {:id}", { event: event.id, id: registration.id }) });
    exhibition = groups[0];
    if (!exhibition || exhibition.modalidad !== mode.id) return null;
    const links = await pb.collection("integrantes_exposicion").getFullList<ExhibitionMember>({ filter: pb.filter("exposicion = {:id}", { id: exhibition.id }), sort: "orden,id" });
    members = await Promise.all(links.map(async (link) => ({ person: await pb.collection("inscripciones").getOne<RegistrationRecord>(link.participante), role: link.etiqueta, functionId: link.funcion })));
    if (!members.some((m) => m.person.id === registration.id && m.functionId === "principal") || members.some((m) => m.person.evento !== event.id || m.person.modalidad !== mode.id)) return null;
  }
  const hash = fingerprint({ principal: registration.id, members: members.map((m) => ({ id: m.person.id, nombres: m.person.nombres, apellidos: m.person.apellidos, documento: m.person.documento, funcion: m.functionId, etiqueta: m.role })) });
  return { mode, event, registration, exhibition, members, hash, eligible: mode.entrega && registration.acreditado };
}
export async function canDownloadModalCertificate(pb: PocketBase, certificate: CertificateRecord, participantIds: string[]) {
  const [event, principal] = await Promise.all([pb.collection("eventos").getOne<EventRecord>(certificate.evento), pb.collection("inscripciones").getOne<RegistrationRecord>(certificate.inscripcion)]);
  const subject = await certificateSubject(pb, event, principal);
  if (!subject?.eligible || subject.mode.id !== certificate.modalidad || (certificate.huella && certificate.huella !== subject.hash)) return false;
  if ((certificate.exposicion || "") !== (subject.exhibition?.id || "")) return false;
  const recipients = await pb.collection("destinatarios_certificado").getFullList({ filter: pb.filter("certificado = {:id}", { id: certificate.id }) });
  return subject.members.some((m) => participantIds.includes(m.person.id) && recipients.some((r) => r.participante === m.person.id));
}
