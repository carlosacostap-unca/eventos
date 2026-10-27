import "server-only";

import { ClientResponseError, type RecordModel } from "pocketbase";

import { createCertificatePdf } from "@/lib/certificates/pdf";
import { DomainError } from "@/lib/domain/errors";
import type { ParticipantAccess } from "@/lib/certificates/public-access";
import { offersAttendanceCertificate } from "@/lib/domain/event-details";
import type {
  CertificateRecord,
  EventRecord,
  RegistrationRecord,
} from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { audit } from "@/lib/services/audit";
import { getEventById } from "@/lib/services/events";
import { getEventTypeById } from "@/lib/services/event-types";
import { listRegistrations } from "@/lib/services/registrations";
import { listModalities, modalityVersion } from "./modalities";
import { certificateSubject, certificateSubjects, canDownloadModalCertificate } from "./certificate-subjects";
import { exhibitionTitle } from "@/lib/domain/modalities";
import { withOperationLock } from "./operation-lock";
import { recordId } from "@/lib/domain/fingerprints";

function toCertificate(record: RecordModel): CertificateRecord {
  return record as unknown as CertificateRecord;
}

async function fetchProtectedFile(
  record: RecordModel,
  filename: string,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const pb = await createServicePocketBase();
  const token = await pb.files.getToken();
  const response = await fetch(pb.files.getURL(record, filename, { token }), {
    headers: { Authorization: pb.authStore.token },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No se pudo descargar el archivo de PocketBase.");
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") || "application/octet-stream",
  };
}

async function findCertificate(registrationId: string, exhibitionId?: string) {
  const pb = await createServicePocketBase();
  try {
    return toCertificate(
      await pb
        .collection("certificados")
        .getFirstListItem(
          pb.filter("inscripcion = {:registrationId}" + (exhibitionId !== undefined ? " && exposicion = {:exhibitionId}" : ""), { registrationId, exhibitionId }),
        ),
    );
  } catch (error) {
    if (!(error instanceof ClientResponseError) || error.status !== 404) throw error;
    return null;
  }
}

async function loadTemplate(event: EventRecord) {
  if (!event.plantilla_certificado) return undefined;
  return fetchProtectedFile(
    event as unknown as RecordModel,
    event.plantilla_certificado,
  );
}

async function loadEventTypeName(event: EventRecord) {
  const type = event.tipo_evento ? await getEventTypeById(event.tipo_evento) : null;
  return type?.nombre || "Evento";
}

export async function previewCertificate(eventId: string, modalityId?: string) {
  const event = await getEventById(eventId);
  if (!event) throw new DomainError("NOT_FOUND", "El evento no existe.");
  if (modalityId) {
    const modes = await listModalities(eventId);
    const mode = modes.find((m) => m.id === modalityId);
    if (!mode) throw new DomainError("NOT_FOUND", "La modalidad no pertenece al evento.");
    const definition = (await modalityVersion(mode.version_publicada)).esquema;
    const members = definition.certificate === "grupo" ? [{ nombres: "Nombre del alumno", apellidos: "Apellido", documento: "12345678", role: definition.principal }, ...definition.roles.flatMap((r) => Array.from({ length: Math.max(r.min, 1) }, () => ({ nombres: "Nombre de ejemplo", apellidos: "Apellido del integrante", documento: "23456789", role: r.label })))] : undefined;
    return createCertificatePdf({ event: { ...event, textos_certificado: mode.textos_certificado }, eventTypeName: await loadEventTypeName(event), registration: { id: "vista-previa", nombres: members?.[0].nombres ?? "Nombre", apellidos: members?.[0].apellidos ?? "Apellido", documento: "12345678", respuestas: Object.fromEntries(definition.fields.map(field => [field.id, field.label + " de ejemplo"])) }, members, template: mode.plantilla_certificado ? await fetchProtectedFile(mode as unknown as RecordModel, mode.plantilla_certificado) : undefined });
  }
  if (!offersAttendanceCertificate(event)) {
    throw new DomainError("DISABLED", "Este evento no entrega certificados.");
  }
  return createCertificatePdf({
    event,
    eventTypeName: await loadEventTypeName(event),
    registration: {
      id: "vista-previa",
      nombres: "Nombre",
      apellidos: "Apellido",
      documento: "00.000.000",
    },
    template: await loadTemplate(event),
  });
}

export async function generateCertificates(
  eventId: string,
  adminId: string,
  options: { regenerate?: boolean } = {},
) {
  const event = await getEventById(eventId);
  if (!event) throw new DomainError("NOT_FOUND", "El evento no existe.");
  const modes = await listModalities(eventId);
  if (modes.length) return generateModalCertificates(event, adminId, !!options.regenerate);
  if (!offersAttendanceCertificate(event)) {
    throw new DomainError("DISABLED", "Este evento no entrega certificados.");
  }
  const registrations = (await listRegistrations(eventId)).filter(
    (registration) => registration.acreditado,
  );
  const template = await loadTemplate(event);
  const eventTypeName = await loadEventTypeName(event);
  let created = 0;
  let reused = 0;
  let regenerated = 0;

  for (const registration of registrations) {
    const certificate = await findCertificate(registration.id);
    if (!certificate || options.regenerate) {
      const pdf = await createCertificatePdf({ event, registration, template, eventTypeName });
      const form = new FormData();
      form.set("evento", event.id);
      form.set("inscripcion", registration.id);
      form.set("generado_en", new Date().toISOString());
      form.set(
        "archivo",
        new File(
          [pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer],
          "certificado-" + registration.documento_normalizado + ".pdf",
          { type: "application/pdf" },
        ),
      );
      const pb = await createServicePocketBase();
      if (certificate) {
        await pb.collection("certificados").update(certificate.id, form);
        regenerated += 1;
      } else {
        await pb.collection("certificados").create(form);
        created += 1;
      }
    } else {
      reused += 1;
    }

  }

  await audit({
    adminId,
    action: options.regenerate ? "certificados.regenerados" : "certificados.generados",
    entity: "evento",
    entityId: eventId,
    data: { created, reused, regenerated, eligible: registrations.length },
  });

  return { created, reused, regenerated, eligible: registrations.length };
}

export type CertificateRow = {
  registration: RegistrationRecord;
  certificate: CertificateRecord;
  stale?: boolean;
  eligible?: boolean;
  members?: string[];
  exhibitionTitle?: string;
};

export async function listCertificateRows(eventId: string): Promise<CertificateRow[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection("certificados").getFullList({
    filter: pb.filter("evento = {:eventId}", { eventId }),
    sort: "generado_en",
    expand: "inscripcion",
  });

  const rows = records.flatMap((record) => {
    const expanded = record.expand as { inscripcion?: RecordModel } | undefined;
    if (!expanded?.inscripcion) return [];
    return [
      {
        registration: expanded.inscripcion as unknown as RegistrationRecord,
        certificate: toCertificate(record),
      },
    ];
  });
  return Promise.all(rows.map(async (row) => {
    if (!row.certificate.modalidad) return row;
    const event = await getEventById(eventId);
    const subject = event ? await certificateSubject(pb, event, row.registration, row.certificate.exposicion || undefined) : null;
    const title = subject?.exhibition ? exhibitionTitle((await modalityVersion(subject.exhibition.version)).esquema, subject.exhibition.respuestas) : undefined;
    return { ...row, exhibitionTitle: title, stale: !!row.certificate.huella && row.certificate.huella !== subject?.hash, eligible: !!subject?.eligible, members: subject?.members.map((m) => `${m.role}: ${m.person.apellidos}, ${m.person.nombres}`) };
  }));
}

export async function getCertificateDownload(certificateId: string, access?: ParticipantAccess) {
  const pb = await createServicePocketBase();
  const certificate = toCertificate(
    await pb.collection("certificados").getOne(certificateId),
  );
  const registration = (await pb
    .collection("inscripciones")
    .getOne(certificate.inscripcion)) as unknown as RegistrationRecord;
  if (certificate.modalidad) {
    let ids = access?.registrationIds ?? [registration.id];
    // Cookies históricas contienen IDs de certificados; se conservan solo para su titular.
    if (access?.certificateIds.includes(certificateId) && !ids.length) ids = [registration.id];
    if (!await canDownloadModalCertificate(pb, certificate, ids)) throw new DomainError("UNAUTHORIZED", "El certificado no está disponible.");
    const file = await fetchProtectedFile(certificate as unknown as RecordModel, certificate.archivo);
    return { bytes: file.bytes, filename: "certificado-" + (certificate.exposicion || registration.documento_normalizado) + ".pdf" };
  }
  if (access && (!registration.acreditado || registration.evento !== certificate.evento ||
      (!access.certificateIds.includes(certificateId) && !access.registrationIds.includes(registration.id)))) {
    throw new DomainError("UNAUTHORIZED", "El certificado no está disponible.");
  }
  const file = await fetchProtectedFile(
    certificate as unknown as RecordModel,
    certificate.archivo,
  );
  return {
    bytes: file.bytes,
    filename: "certificado-" + registration.documento_normalizado + ".pdf",
  };
}

async function generateModalCertificates(event: EventRecord, adminId: string, regenerate: boolean) {
  const pb = await createServicePocketBase();
  return withOperationLock(pb, "evento:" + event.id, async (assertOwned) => {
    const registrations = (await listRegistrations(event.id)).filter((r) => r.tipo_alta !== "vinculada" && r.acreditado);
    let created = 0, reused = 0, regenerated = 0, eligible = 0;
    for (const registration of registrations) {
      for (const subject of await certificateSubjects(pb, event, registration)) {
        if (!subject.eligible) continue;
        eligible++;
        const existing = await findCertificate(registration.id, subject.exhibition?.id ?? "");
        if (existing && !regenerate) { reused++; continue; }
        const template = subject.mode.plantilla_certificado ? await fetchProtectedFile(subject.mode as unknown as RecordModel, subject.mode.plantilla_certificado) : undefined;
        const pdf = await createCertificatePdf({ event: { ...event, textos_certificado: subject.mode.textos_certificado }, eventTypeName: await loadEventTypeName(event), registration: subject.registration, template, members: subject.exhibition ? subject.members.map((m) => ({ ...m.person, role: m.role })) : undefined });
        const current = await pb.collection("inscripciones").getOne<RegistrationRecord>(registration.id);
        const finalSubject = await certificateSubject(pb, event, current, subject.exhibition?.id);
        if (!finalSubject?.eligible || finalSubject.hash !== subject.hash) throw new DomainError("INVALID", "Los datos cambiaron durante la emisión. Volvé a generar el lote.");
        const id = existing?.id ?? recordId();
        const data = { evento: event.id, inscripcion: registration.id, modalidad: subject.mode.id, alcance: subject.exhibition ? "grupo" : "individual", exposicion: subject.exhibition?.id ?? "", huella: subject.hash, version_formulario: subject.registration.version_formulario, generado_en: new Date().toISOString(), archivo: new File([pdf.slice().buffer as ArrayBuffer], "certificado-" + id + ".pdf", { type: "application/pdf" }) };
        const batch = pb.createBatch();
        if (existing) batch.collection("certificados").update(id, data); else batch.collection("certificados").create({ ...data, id });
        const recipients = existing ? await pb.collection("destinatarios_certificado").getFullList({ filter: pb.filter("certificado = {:id}", { id }) }) : [];
        for (const r of recipients) batch.collection("destinatarios_certificado").delete(r.id);
        for (const m of subject.members) batch.collection("destinatarios_certificado").create({ certificado: id, participante: m.person.id });
        await assertOwned();
        await batch.send();
        if (existing) regenerated++; else created++;
      }
    }
    const result = { created, reused, regenerated, eligible };
    await audit({ adminId, action: regenerate ? "certificados.regenerados" : "certificados.generados", entity: "evento", entityId: event.id, data: result });
    return result;
  });
}
