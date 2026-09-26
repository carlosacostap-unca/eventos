import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

import { describe, expect, it, vi } from "vitest";

const localEnvPath = resolve(process.cwd(), ".env.local");
if (existsSync(localEnvPath)) {
  for (const [name, value] of Object.entries(parseEnv(readFileSync(localEnvPath, "utf8")))) {
    process.env[name] ??= value;
  }
}
vi.mock("server-only", () => ({}));

const enabled = process.env.RUN_INTEGRATION === "1";

describe.skipIf(!enabled)("flujo integral de eventos", () => {
  it(
    "inscribe, completa cupo, acredita, agrega presencial, genera, consulta y descarga sin correo",
    async () => {
      const [{ createServicePocketBase }, events, registrations, certificates, lookup, metrics, models, access] =
        await Promise.all([
          import("@/lib/pocketbase/client"),
          import("@/lib/services/events"),
          import("@/lib/services/registrations"),
          import("@/lib/services/certificates"),
          import("@/lib/services/certificate-lookup"),
          import("@/lib/domain/metrics"),
          import("@/lib/domain/models"),
          import("@/lib/certificates/public-access"),
        ]);

      const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
      const firstDocument = `91${suffix.slice(0, 6)}`;
      const secondDocument = `92${suffix.slice(0, 6)}`;
      const walkInDocument = `93${suffix.slice(0, 6)}`;
      const email = `integracion-${suffix}@example.com`;
      const origin = `integration-${suffix}`;
      let eventId = "";
      const auditEntityIds: string[] = [];

      try {
        const pb = await createServicePocketBase();
        const adminId = "";

        const event = await events.createEvent({
          titulo: `Integración ${suffix}`,
          tipoEvento: "",
          descripcion: "Evento temporal para verificar el flujo integral.",
          slug: `integracion-${suffix}`,
          inicio: new Date("2027-10-10T12:00:00.000Z"),
          fin: new Date("2027-10-10T18:00:00.000Z"),
          lugar: "Laboratorio de pruebas",
          cupo: 2,
          costo: "gratuito",
          certificadoAsistencia: "si",
          inscripcionHabilitada: true,
          estado: "publicado",
        });
        eventId = event.id;
        auditEntityIds.push(event.id);

        const first = await registrations.registerPublic(event, {
          nombres: "Ada",
          apellidos: "Lovelace",
          email,
          documento: firstDocument,
        });
        const second = await registrations.registerPublic(event, {
          nombres: "Grace",
          apellidos: "Hopper",
          email: `segunda-${suffix}@example.com`,
          documento: secondDocument,
        });
        auditEntityIds.push(first.id, second.id);

        await expect(
          registrations.registerPublic(event, {
            nombres: "Cupo",
            apellidos: "Completo",
            email: `tercera-${suffix}@example.com`,
            documento: `94${suffix.slice(0, 6)}`,
          }),
        ).rejects.toMatchObject({ code: "FULL" });

        await registrations.setAttendance(first.id, true, adminId);
        const walkIn = await registrations.createWalkIn(
          event.id,
          {
            nombres: "Katherine",
            apellidos: "Johnson",
            email: `presencial-${suffix}@example.com`,
            documento: walkInDocument,
          },
          adminId,
          true,
        );
        auditEntityIds.push(walkIn.id);

        await expect(certificates.generateCertificates(event.id, adminId)).resolves.toEqual({
          created: 2,
          reused: 0,
          eligible: 2,
        });

        const found = await lookup.findPublicCertificates({
          normalizedDocument: models.normalizeDocument(firstDocument),
          normalizedEmail: email,
        });
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ eventTitle: event.titulo });

        const token = await access.sealCertificateAccess(
          found.map((item) => item.id),
          process.env.SESSION_SECRET!,
        );
        await expect(
          access.unsealCertificateAccess(token, process.env.SESSION_SECRET!),
        ).resolves.toEqual([found[0].id]);

        const download = await certificates.getCertificateDownload(found[0].id);
        expect(new TextDecoder().decode(download.bytes.slice(0, 4))).toBe("%PDF");

        const rows = await registrations.listRegistrations(event.id);
        expect(metrics.calculateEventMetrics(rows)).toMatchObject({
          total: 3,
          publicas: 2,
          presenciales: 1,
          acreditados: 2,
          ausentes: 1,
        });

        const deliveryJobs = await pb.collection("envios_certificados").getList(1, 1, {
          filter: pb.filter("evento = {:eventId}", { eventId: event.id }),
          fields: "id",
        });
        expect(deliveryJobs.totalItems).toBe(0);

        expect(
          await lookup.consumePersistentLookupAttempt({
            origin,
            normalizedDocument: models.normalizeDocument(firstDocument),
          }),
        ).toBe(true);
      } finally {
        const pb = await createServicePocketBase();
        const limitKey = access.deriveLookupLimitKey({
          secret: process.env.SESSION_SECRET!,
          origin,
          normalizedDocument: models.normalizeDocument(firstDocument),
        });
        const limits = await pb.collection("limites_consulta_certificados").getFullList({
          filter: pb.filter("clave = {:key}", { key: limitKey }),
          fields: "id",
        });
        for (const record of limits) await pb.collection("limites_consulta_certificados").delete(record.id);

        if (eventId) {
          try {
            await pb.collection("eventos").delete(eventId);
          } catch {
            // El evento pudo no haberse creado si falló la preparación.
          }
        }
        if (auditEntityIds.length > 0) {
          const filter = auditEntityIds
            .map((id) => pb.filter("entidad_id = {:id}", { id }))
            .map((part) => `(${part})`)
            .join(" || ");
          const audits = await pb.collection("auditoria").getFullList({ filter, fields: "id" });
          for (const record of audits) await pb.collection("auditoria").delete(record.id);
        }
      }
    },
    60_000,
  );
});
