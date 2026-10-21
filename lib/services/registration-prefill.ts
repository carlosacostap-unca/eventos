import "server-only";

import { deriveLookupLimitKey } from "@/lib/certificates/public-access";
import { normalizeDocument, registrationInputSchema, type RegistrationInput } from "@/lib/domain/models";
import { getServerEnv } from "@/lib/env";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { consumePersistentLookupAttempt } from "./certificate-lookup";
import { withOperationLock } from "./operation-lock";

// Una sola cuota por origen: cambiar de DNI no permite eludir el límite.
// La clave persistida no contiene el DNI ni la dirección IP en texto plano.
export async function allowRegistrationPrefill(origin: string): Promise<boolean> {
  const scope = { origin: "registration-prefill:" + origin, normalizedDocument: "all-documents" };
  const key = deriveLookupLimitKey({ secret: getServerEnv().SESSION_SECRET, ...scope });
  const pb = await createServicePocketBase();
  return withOperationLock(pb, "prefill:" + key, () => consumePersistentLookupAttempt({ ...scope, maxAttempts: 30 }));
}

export async function findRegistrationIdentity(document: string, eventId: string): Promise<RegistrationInput | null> {
  const pb = await createServicePocketBase();
  const normalized = normalizeDocument(document);
  const documentFilter = pb.filter("documento_normalizado = {:document}", { document: normalized });
  const options = { fields: "nombres,apellidos,documento,email", sort: "-updated,-created,-id" };
  // En el mismo evento se conserva la identidad que ya usan las exposiciones.
  const current = await pb.collection("inscripciones").getList(1, 1, {
    ...options, filter: documentFilter + " && " + pb.filter("evento = {:event}", { event: eventId }),
  });
  const result = current.items.length ? current : await pb.collection("inscripciones").getList(1, 1, {
    ...options, filter: documentFilter,
  });
  const person = registrationInputSchema.safeParse(result.items[0]);
  // Nunca enviar IDs, asistencia, respuestas o información sobre eventos previos.
  return person.success ? person.data : null;
}
