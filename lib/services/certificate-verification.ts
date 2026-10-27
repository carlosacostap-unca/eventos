import "server-only";

import { ClientResponseError } from "pocketbase";
import { parseCertificateCode, certificateVerificationCode } from "@/lib/certificates/verification-code";
import type { CertificateRecord, EventRecord, RegistrationRecord } from "@/lib/domain/models";
import { exhibitionTitle } from "@/lib/domain/modalities";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { certificateSubject } from "./certificate-subjects";
import { modalityVersion } from "./modalities";

export type VerifiedCertificate = {
  code: string;
  eventTitle: string;
  eventDate: string;
  issuedAt: string;
  modality: string;
  workTitle?: string;
  participants: Array<{ name: string; document: string; role: string }>;
};
export type CertificateVerificationResult = {
  legacy: boolean;
  certificates: VerifiedCertificate[];
  unavailableCount: number;
};

export async function verifyCertificateCode(value: string): Promise<CertificateVerificationResult> {
  const parsed = parseCertificateCode(value);
  if (!parsed) throw new Error("El código de certificado no es válido.");
  const pb = await createServicePocketBase();
  const records = await pb.collection("certificados").getFullList<CertificateRecord>({
    filter: parsed.kind === "certificate"
      ? pb.filter("id = {:id}", { id: parsed.certificateId })
      : pb.filter("evento = {:eventId} && inscripcion = {:registrationId}", parsed),
    sort: "-generado_en",
  });
  const certificates: VerifiedCertificate[] = [];
  let unavailableCount = 0;
  for (const certificate of records) {
    // Recheck ownership even if a storage response does not honor the filter.
    if (parsed.kind === "certificate" ? certificate.id !== parsed.certificateId : certificate.evento !== parsed.eventId || certificate.inscripcion !== parsed.registrationId) continue;
    try {
      if (!certificate.archivo) { unavailableCount++; continue; }
      const [event, registration] = await Promise.all([
        pb.collection("eventos").getOne<EventRecord>(certificate.evento),
        pb.collection("inscripciones").getOne<RegistrationRecord>(certificate.inscripcion),
      ]);
      if (event.estado === "borrador" || registration.evento !== event.id || !registration.acreditado) { unavailableCount++; continue; }
      let participants = [{ name: `${registration.apellidos}, ${registration.nombres}`, document: registration.documento, role: "Participante" }];
      let modality = "Asistente";
      let workTitle: string | undefined;
      if (certificate.modalidad) {
        const subject = await certificateSubject(pb, event, registration, certificate.exposicion || undefined);
        if (!subject?.eligible || subject.mode.id !== certificate.modalidad ||
          (certificate.huella && certificate.huella !== subject.hash) ||
          (certificate.exposicion || "") !== (subject.exhibition?.id || "")) { unavailableCount++; continue; }
        const recipients = await pb.collection("destinatarios_certificado").getFullList({ filter: pb.filter("certificado = {:id}", { id: certificate.id }) });
        if (!subject.members.every((m) => recipients.some((r) => r.participante === m.person.id))) { unavailableCount++; continue; }
        participants = subject.members.map((m) => ({ name: `${m.person.apellidos}, ${m.person.nombres}`, document: m.person.documento, role: m.role }));
        modality = subject.mode.nombre;
        if (subject.exhibition) workTitle = exhibitionTitle((await modalityVersion(subject.exhibition.version)).esquema, subject.exhibition.respuestas);
      }
      certificates.push({ code: certificateVerificationCode(certificate.id), eventTitle: event.titulo, eventDate: event.inicio, issuedAt: certificate.generado_en, modality, ...(workTitle ? { workTitle } : {}), participants });
    } catch (error) {
      if (!(error instanceof ClientResponseError) || error.status !== 404) throw error;
      unavailableCount++;
    }
  }
  return { legacy: parsed.kind === "legacy", certificates, unavailableCount };
}
