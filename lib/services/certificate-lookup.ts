import "server-only";

import type { RecordModel } from "pocketbase";

import {
  consumeLookupAttempt,
  deriveLookupLimitKey,
  type LookupLimitState,
} from "@/lib/certificates/public-access";
import type { EventRecord, RegistrationRecord } from "@/lib/domain/models";
import { normalizeDocument } from "@/lib/domain/models";
import { getServerEnv } from "@/lib/env";
import { createServicePocketBase } from "@/lib/pocketbase/client";

type LookupLimitRecord = RecordModel & {
  clave: string;
  ventana_inicio: string;
  intentos: number;
  bloqueado_hasta?: string;
};

export type PublicCertificate = {
  id: string;
  eventTitle: string;
  eventDate: string;
};

function toLimitState(record: LookupLimitRecord): LookupLimitState {
  return {
    windowStartedAt: record.ventana_inicio,
    attempts: record.intentos,
    blockedUntil: record.bloqueado_hasta || undefined,
  };
}

function limitPayload(key: string, state: LookupLimitState) {
  return {
    clave: key,
    ventana_inicio: state.windowStartedAt,
    intentos: state.attempts,
    bloqueado_hasta: state.blockedUntil || "",
  };
}

function limitStateChanged(current: LookupLimitState, next: LookupLimitState) {
  return (
    current.windowStartedAt !== next.windowStartedAt ||
    current.attempts !== next.attempts ||
    current.blockedUntil !== next.blockedUntil
  );
}

export async function consumePersistentLookupAttempt(input: {
  origin: string;
  normalizedDocument: string;
}) {
  const env = getServerEnv();
  const key = deriveLookupLimitKey({
    secret: env.SESSION_SECRET,
    origin: input.origin,
    normalizedDocument: input.normalizedDocument,
  });
  const pb = await createServicePocketBase();
  let record: LookupLimitRecord | null = null;
  try {
    record = (await pb
      .collection("limites_consulta_certificados")
      .getFirstListItem(pb.filter("clave = {:key}", { key }))) as LookupLimitRecord;
  } catch {
    // La ausencia del registro es el estado inicial esperado.
  }

  const decision = consumeLookupAttempt(record ? toLimitState(record) : null);
  if (record) {
    if (limitStateChanged(toLimitState(record), decision.state)) {
      await pb
        .collection("limites_consulta_certificados")
        .update(record.id, limitPayload(key, decision.state));
    }
    return decision.allowed;
  }

  try {
    await pb
      .collection("limites_consulta_certificados")
      .create(limitPayload(key, decision.state));
    return decision.allowed;
  } catch {
    // Una consulta concurrente pudo crear la misma clave. Relee y consume ese estado.
    const concurrent = (await pb
      .collection("limites_consulta_certificados")
      .getFirstListItem(pb.filter("clave = {:key}", { key }))) as LookupLimitRecord;
    const retry = consumeLookupAttempt(toLimitState(concurrent));
    if (retry.allowed) {
      await pb
        .collection("limites_consulta_certificados")
        .update(concurrent.id, limitPayload(key, retry.state));
    }
    return retry.allowed;
  }
}

export async function findPublicCertificates(input: {
  normalizedDocument: string;
}): Promise<PublicCertificate[]> {
  const pb = await createServicePocketBase();
  const registrations = (await pb.collection("inscripciones").getFullList({
    filter: pb.filter(
      "documento_normalizado = {:document} && acreditado = true",
      { document: input.normalizedDocument },
    ),
    fields: "id",
  })) as RegistrationRecord[];
  if (registrations.length === 0) return [];

  const certificateFilter = registrations
    .map((registration) =>
      pb.filter("inscripcion = {:registrationId}", {
        registrationId: registration.id,
      }),
    )
    .map((filter) => `(${filter})`)
    .join(" || ");
  const certificates = await pb.collection("certificados").getFullList({
    filter: certificateFilter,
    sort: "-generado_en",
    expand: "evento",
  });

  return certificates.flatMap((certificate) => {
    const event = (certificate.expand as { evento?: EventRecord } | undefined)?.evento;
    if (!event) return [];
    return [{ id: certificate.id, eventTitle: event.titulo, eventDate: event.inicio }];
  });
}

export function normalizeCertificateLookup(input: { document: string }) {
  return {
    normalizedDocument: normalizeDocument(input.document),
  };
}
