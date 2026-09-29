import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { expect, it, vi } from "vitest";

const localEnv = resolve(process.cwd(), ".env.local");
if (existsSync(localEnv)) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync(localEnv, "utf8")))) process.env[key] ??= value;
}
vi.mock("server-only", () => ({}));

it.skipIf(process.env.RUN_INTEGRATION !== "1")("guarda material protegido y lo entrega solo mientras la inscripción está acreditada", async () => {
  const { createServicePocketBase } = await import("@/lib/pocketbase/client");
  const { uploadMaterial, getMaterialDownload } = await import("@/lib/services/materials");
  const { getParticipantResources } = await import("@/lib/services/participant-resources");
  const pb = await createServicePocketBase();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  let eventId = "";
  let materialId = "";
  try {
    const event = await pb.collection("eventos").create({ titulo: `Prueba materiales ${suffix}`, slug: `prueba-materiales-${suffix}`, descripcion: "Evento temporal de prueba de materiales.", inicio: "2027-01-01 12:00:00Z", fin: "2027-01-01 13:00:00Z", lugar: "Prueba", cupo: 1, estado: "borrador", certificado_asistencia: "no" });
    eventId = event.id;
    const registration = await pb.collection("inscripciones").create({ evento: eventId, nombres: "Persona", apellidos: "De Prueba", email: `prueba-${suffix}@example.com`, documento: suffix, documento_normalizado: suffix.toUpperCase(), origen: "presencial", acreditado: true });
    const content = "%PDF-1.4\nMaterial de prueba sin datos personales\n%%EOF";
    const material = await uploadMaterial(eventId, "Guía de prueba", new File([content], "guia.pdf", { type: "application/pdf" }), "");
    materialId = material.id;
    const stored = await pb.collection("materiales_evento").getOne(materialId);
    expect(stored.archivo).toBeTruthy();
    expect((await fetch(pb.files.getURL(stored, stored.archivo))).ok).toBe(false);
    const resources = await getParticipantResources({ certificateIds: [], registrationIds: [registration.id] });
    expect(resources?.events[0].certificateId).toBeUndefined();
    expect(resources?.events[0].materials[0].id).toBe(materialId);
    const download = await getMaterialDownload(materialId, { registrationIds: [registration.id] });
    expect(await new Response(download.body).text()).toBe(content);
    await expect(getMaterialDownload(materialId, { registrationIds: ["ajeno0000000001"] })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await pb.collection("inscripciones").update(registration.id, { acreditado: false });
    await expect(getMaterialDownload(materialId, { registrationIds: [registration.id] })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  } finally {
    if (eventId) await pb.collection("eventos").delete(eventId);
    if (materialId) {
      const audits = await pb.collection("auditoria").getFullList({ filter: pb.filter('entidad = "material" && entidad_id = {:id}', { id: materialId }), fields: "id" });
      for (const record of audits) await pb.collection("auditoria").delete(record.id);
    }
  }
}, 60_000);
