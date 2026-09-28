import "server-only";

import { ClientResponseError, type RecordModel } from "pocketbase";

import { createCertificatePdf } from "@/lib/certificates/pdf";
import { DomainError } from "@/lib/domain/errors";
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

function toCertificate(record: RecordModel): CertificateRecord {
  return record as unknown as CertificateRecord;
}

async function fetchProtectedFile(
  record: RecordModel,
  filename: string,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const pb = await createServicePocketBase();
  const response = await fetch(pb.files.getURL(record, filename), {
    headers: { Authorization: pb.authStore.token },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No se pudo descargar el archivo de PocketBase.");
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") || "application/octet-stream",
  };
}

async function findCertificate(registrationId: string) {
  const pb = await createServicePocketBase();
  try {
    return toCertificate(
      await pb
        .collection("certificados")
        .getFirstListItem(
          pb.filter("inscripcion = {:registrationId}", { registrationId }),
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

export async function previewCertificate(eventId: string) {
  const event = await getEventById(eventId);
  if (!event) throw new DomainError("NOT_FOUND", "El evento no existe.");
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
};

export async function listCertificateRows(eventId: string): Promise<CertificateRow[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection("certificados").getFullList({
    filter: pb.filter("evento = {:eventId}", { eventId }),
    sort: "generado_en",
    expand: "inscripcion",
  });

  return records.flatMap((record) => {
    const expanded = record.expand as { inscripcion?: RecordModel } | undefined;
    if (!expanded?.inscripcion) return [];
    return [
      {
        registration: expanded.inscripcion as unknown as RegistrationRecord,
        certificate: toCertificate(record),
      },
    ];
  });
}

export async function getCertificateDownload(certificateId: string) {
  const pb = await createServicePocketBase();
  const certificate = toCertificate(
    await pb.collection("certificados").getOne(certificateId),
  );
  const registration = (await pb
    .collection("inscripciones")
    .getOne(certificate.inscripcion)) as unknown as RegistrationRecord;
  const file = await fetchProtectedFile(
    certificate as unknown as RecordModel,
    certificate.archivo,
  );
  return {
    bytes: file.bytes,
    filename: "certificado-" + registration.documento_normalizado + ".pdf",
  };
}
