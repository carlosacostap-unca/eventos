import "server-only";

import type { RecordModel } from "pocketbase";

import { createCertificatePdf } from "@/lib/certificates/pdf";
import { DomainError } from "@/lib/domain/errors";
import type {
  CertificateRecord,
  DeliveryRecord,
  EventRecord,
  RegistrationRecord,
} from "@/lib/domain/models";
import { processDeliveryAttempt } from "@/lib/email/queue";
import { sendCertificateEmail } from "@/lib/email/mailer";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { audit } from "@/lib/services/audit";
import { getEventById } from "@/lib/services/events";
import { listRegistrations } from "@/lib/services/registrations";

function toCertificate(record: RecordModel): CertificateRecord {
  return record as unknown as CertificateRecord;
}

function toDelivery(record: RecordModel): DeliveryRecord {
  return record as unknown as DeliveryRecord;
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
  } catch {
    return null;
  }
}

async function findDelivery(certificateId: string) {
  const pb = await createServicePocketBase();
  try {
    return toDelivery(
      await pb
        .collection("envios_certificados")
        .getFirstListItem(
          pb.filter("certificado = {:certificateId}", { certificateId }),
        ),
    );
  } catch {
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

export async function previewCertificate(eventId: string) {
  const event = await getEventById(eventId);
  if (!event) throw new DomainError("NOT_FOUND", "El evento no existe.");
  return createCertificatePdf({
    event,
    registration: {
      id: "vista-previa",
      nombres: "Nombre",
      apellidos: "Apellido",
    },
    template: await loadTemplate(event),
  });
}

export async function generateCertificates(eventId: string, adminId: string) {
  const event = await getEventById(eventId);
  if (!event) throw new DomainError("NOT_FOUND", "El evento no existe.");
  const registrations = (await listRegistrations(eventId)).filter(
    (registration) => registration.acreditado,
  );
  const template = await loadTemplate(event);
  let created = 0;
  let reused = 0;

  for (const registration of registrations) {
    let certificate = await findCertificate(registration.id);
    if (!certificate) {
      const pdf = await createCertificatePdf({ event, registration, template });
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
      certificate = toCertificate(
        await pb.collection("certificados").create(form),
      );
      created += 1;
    } else {
      reused += 1;
    }

    if (!(await findDelivery(certificate.id))) {
      const pb = await createServicePocketBase();
      await pb.collection("envios_certificados").create({
        evento: event.id,
        inscripcion: registration.id,
        certificado: certificate.id,
        estado: "pendiente",
        intentos: 0,
        historial: [],
      });
    }
  }

  await audit({
    adminId,
    action: "certificados.generados",
    entity: "evento",
    entityId: eventId,
    data: { created, reused, eligible: registrations.length },
  });

  return { created, reused, eligible: registrations.length };
}

export type CertificateRow = {
  delivery: DeliveryRecord;
  registration: RegistrationRecord;
  certificate: CertificateRecord;
};

export async function listCertificateRows(eventId: string): Promise<CertificateRow[]> {
  const pb = await createServicePocketBase();
  const records = await pb.collection("envios_certificados").getFullList({
    filter: pb.filter("evento = {:eventId}", { eventId }),
    sort: "created",
    expand: "inscripcion,certificado",
  });

  return records.flatMap((record) => {
    const expanded = record.expand as
      | { inscripcion?: RecordModel; certificado?: RecordModel }
      | undefined;
    if (!expanded?.inscripcion || !expanded.certificado) return [];
    return [
      {
        delivery: toDelivery(record),
        registration: expanded.inscripcion as unknown as RegistrationRecord,
        certificate: toCertificate(expanded.certificado),
      },
    ];
  });
}

export async function requeueDelivery(deliveryId: string, adminId: string) {
  const pb = await createServicePocketBase();
  const delivery = toDelivery(
    await pb.collection("envios_certificados").update(deliveryId, {
      estado: "pendiente",
      error: "",
    }),
  );
  await audit({
    adminId,
    action: "certificado.reenvio_solicitado",
    entity: "envio_certificado",
    entityId: deliveryId,
  });
  return delivery;
}

async function loadDeliveryPayload(delivery: DeliveryRecord) {
  const pb = await createServicePocketBase();
  const registration = (await pb
    .collection("inscripciones")
    .getOne(delivery.inscripcion)) as unknown as RegistrationRecord;
  const event = (await pb
    .collection("eventos")
    .getOne(delivery.evento)) as unknown as EventRecord;
  const certificate = toCertificate(
    await pb.collection("certificados").getOne(delivery.certificado),
  );
  const file = await fetchProtectedFile(
    certificate as unknown as RecordModel,
    certificate.archivo,
  );
  return { registration, event, certificate, file };
}

export async function processPendingDeliveries(limit = 20) {
  const pb = await createServicePocketBase();
  const page = await pb.collection("envios_certificados").getList(1, limit, {
    filter: 'estado = "pendiente"',
    sort: "created",
  });

  const results = { processed: 0, sent: 0, failed: 0 };
  for (const record of page.items) {
    const delivery = toDelivery(record);
    const payload = await loadDeliveryPayload(delivery);
    const status = await processDeliveryAttempt(delivery, {
      send: () =>
        sendCertificateEmail({
          to: payload.registration.email,
          participantName:
            payload.registration.nombres + " " + payload.registration.apellidos,
          eventTitle: payload.event.titulo,
          pdf: payload.file.bytes,
          filename: payload.certificate.archivo,
        }),
      update: async (data) => {
        const updateClient = await createServicePocketBase();
        await updateClient
          .collection("envios_certificados")
          .update(delivery.id, data);
      },
    });
    results.processed += 1;
    results[status === "enviado" ? "sent" : "failed"] += 1;
  }
  return results;
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
