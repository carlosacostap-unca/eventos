import "server-only";
import { escapeCsv, registrationsToCsv } from "@/lib/domain/csv";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { listModalities, modalityVersion } from "./modalities";
import { listRegistrations, type RegistrationFilters } from "./registrations";
import { eventExhibitions } from "./modal-registration";
import { certificateSubject } from "./certificate-subjects";
import type { EventRecord } from "@/lib/domain/models";

export async function participantCsv(eventId: string, filters: RegistrationFilters, groups = false) {
  const people = await listRegistrations(eventId, filters);
  const modes = Object.fromEntries((await listModalities(eventId)).map((m) => [m.id, m.nombre]));
  const versionIds = [...new Set(people.map((p) => p.version_formulario).filter((v): v is string => !!v))];
  const labels: Record<string, string> = {};
  for (const id of versionIds) { const v = await modalityVersion(id); for (const field of v.esquema.fields) labels[id + ":" + field.id] = `${field.label} (versión ${v.numero})`; }
  if (!groups) return registrationsToCsv(people, { modes, labels });
  const { exhibitions, members } = await eventExhibitions(eventId);
  const all = await listRegistrations(eventId);
  const pb = await createServicePocketBase();
  const event = await pb.collection("eventos").getOne<EventRecord>(eventId);
  const rows: unknown[][] = [];
  for (const group of exhibitions) {
    const principal = all.find((p) => p.id === group.responsable)!;
    const version = await modalityVersion(group.version);
    const shared = version.esquema.certificate === "grupo";
    const subject = await certificateSubject(pb, event, principal, shared ? group.id : undefined);
    const certs = await pb.collection("certificados").getFullList({ filter: shared ? pb.filter("exposicion = {:id}", { id: group.id }) : pb.filter('inscripcion = {:id} && exposicion = ""', { id: principal.id }) });
    const cert = certs[0];
    const state = !subject?.eligible ? "No habilitado" : !cert ? "Sin emitir" : cert.huella && cert.huella !== subject.hash ? "Pendiente de regeneración" : "Emitido";
    for (const member of members.filter((m) => m.exposicion === group.id)) {
      const person = people.find((p) => p.id === member.participante);
      if (!person) continue;
      const fields = member.funcion === "principal" ? version.esquema.fields : version.esquema.roles.find((r) => r.id === member.funcion)?.fields ?? [];
      const answers = fields.map((f) => `${f.label} (${member.etiqueta}, v${version.numero}): ${Array.isArray(member.respuestas?.[f.id]) ? (member.respuestas![f.id] as string[]).join("; ") : member.respuestas?.[f.id] ?? ""}`).join(" | ");
      rows.push([group.id, modes[group.modalidad], member.etiqueta, person.apellidos, person.nombres, person.documento, person.email, principal.apellidos + ", " + principal.nombres, person.origen, person.acreditado ? "Acreditado" : "Sin acreditar", person.acreditado_en ?? "", state, answers]);
    }
  }
  return "\uFEFF" + [["Exposición", "Modalidad", "Función", "Apellidos", "Nombres", "DNI", "Email", "Responsable", "Origen", "Acreditación", "Fecha de acreditación", "Certificado", "Respuestas por función y versión"], ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}
