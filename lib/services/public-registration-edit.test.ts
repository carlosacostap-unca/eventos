import PocketBase, { ClientResponseError } from "pocketbase";
import { randomUUID } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { attendeeDefinition, exhibitorDefinition, SECOND_EXHIBITOR_ROLE } from "@/lib/domain/modalities";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ client: null as unknown, version: vi.fn(), modes: vi.fn(), send: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ SESSION_SECRET: "public-registration-tests-secret" }) }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => mocks.client }));
vi.mock("./operation-lock", () => ({ withOperationLock: async (_pb: unknown, _key: string, run: (assert: () => Promise<void>) => Promise<unknown>) => run(async () => {}) }));
vi.mock("./modalities", () => ({ modalityVersion: mocks.version, listModalities: mocks.modes }));
vi.mock("./events", () => ({ getEventById: async () => db.eventos[0] }));
vi.mock("./audit", () => ({ audit: async () => {} }));
vi.mock("@/lib/certificates/pdf", () => ({ createCertificatePdf: mocks.pdf }));
import { findEditableRegistration, updatePublicLinkedRegistration } from "./public-registration-edit";
import { registerWithModality } from "./modal-registration";
import { registerPublic, setAttendance, listRegistrations, updateRegistration } from "./registrations";
import { updateExhibition } from "./exhibition-edit";
import { participantCsv } from "./participant-reports";
import { generateCertificates, listCertificateRows } from "./certificates";
import { canDownloadModalCertificate } from "./certificate-subjects";
import { participantCertificates } from "./modal-resources";
import type { EventRecord } from "@/lib/domain/models";

type Row = Record<string, unknown> & { id: string };
let db: Record<string, Row[]>;
const identity = { nombres: "Ana", apellidos: "Pérez", documento: "12345678", email: "ana@example.com" };
const director = { nombres: "Juan", apellidos: "Director", documento: "22222222", email: "director@example.com", respuestas: {}, funcion: "director" };

// Doble de almacenamiento: mantiene IDs y datos entre consultas y confirma
// todas las escrituras juntas, como el batch transaccional de PocketBase.
function filtered(name: string, options?: { filter?: string }) {
  const filter = options?.filter;
  return structuredClone((db[name] ?? []).filter((row) => !filter || filter.split(" || ").some((clause) => clause.split(" && ").every((term) => {
    const match = /^(\w+) (!?=) "([^"]*)"$/.exec(term);
    if (!match) throw new Error("Filtro inesperado: " + term);
    return match[2] === "=" ? row[match[1]] === match[3] : row[match[1]] !== match[3];
  }))));
}

beforeEach(() => {
  vi.resetAllMocks();
  db = {
    eventos: [{ id: "event", estado: "publicado", inscripcion_habilitada: true, fin: "2099-01-01", cupo: 1 }],
    modalidades_inscripcion: [
      { id: "attendee", evento: "event", habilitada: true, version_publicada: "v-attendee", codigo: "asistente" },
      { id: "exhibitor", evento: "event", habilitada: true, version_publicada: "v-exhibitor", codigo: "expositor", entrega: true },
    ],
    inscripciones: [{ id: "student", evento: "event", ...identity, documento_normalizado: identity.documento, modalidad: "attendee", version_formulario: "v-attendee", respuestas: {}, tipo_alta: "principal", origen: "publica", numero_cupo_publico: 1, acreditado: true, acreditado_en: "2026-10-27", acreditado_por: "admin" }],
    exposiciones: [], integrantes_exposicion: [], operaciones_inscripcion: [], certificados: [], destinatarios_certificado: [],
  };
  mocks.version.mockImplementation(async (id: string) => ({ id, modalidad: id === "v-exhibitor" ? "exhibitor" : "attendee", esquema: id === "v-exhibitor" ? exhibitorDefinition : attendeeDefinition }));
  mocks.modes.mockImplementation(async () => db.modalidades_inscripcion);
  mocks.pdf.mockImplementation(async ({ registration }: { registration: { respuestas: { titulo_trabajo: string } } }) => new TextEncoder().encode(registration.respuestas.titulo_trabajo));
  mocks.client = {
    filter: new PocketBase().filter,
    collection: (name: string) => ({
      getFullList: async (options: { filter?: string; expand?: string }) => filtered(name, options).map((row) => options.expand === "inscripcion" ? { ...row, expand: { inscripcion: structuredClone(db.inscripciones.find((person) => person.id === row.inscripcion)) } } : row),
      getFirstListItem: async (filter: string) => { const row = filtered(name, { filter })[0]; if (!row) throw new ClientResponseError({ status: 404 }); return row; },
      getList: async (_page: number, _size: number, options: { filter?: string }) => ({ items: filtered(name, options).slice(0, 1), totalItems: filtered(name, options).length }),
      getOne: async (id: string) => structuredClone(db[name].find((r) => r.id === id)),
      update: async (id: string, data: Row) => { Object.assign(db[name].find((r) => r.id === id)!, data); return structuredClone(db[name].find((r) => r.id === id)); },
    }),
    createBatch: () => {
      const writes: Array<(next: typeof db) => void> = [];
      return {
        collection: (name: string) => ({
          create: (data: Row) => writes.push((next) => { (next[name] ??= []).push({ ...data, id: data.id ?? randomUUID() }); }),
          update: (id: string, data: Row) => writes.push((next) => { Object.assign(next[name].find((r) => r.id === id)!, data); }),
          delete: (id: string) => writes.push((next) => { next[name] = next[name].filter((r) => r.id !== id); }),
        }),
        send: async () => { await mocks.send(); const next = structuredClone(db); for (const write of writes) write(next); db = next; },
      };
    },
  };
});

function exhibitionInput() {
  return { modalidad: "exhibitor", version: "v-exhibitor", operacion: randomUUID(), principal: { ...identity, nombres: "Ana María", email: "actualizado@example.com", respuestas: { titulo_trabajo: "Mi investigación" } }, integrantes: [director] };
}

it("cambia de asistente a expositora sin duplicar persona, cupo ni acreditación", async () => {
  const lookup = (await findEditableRegistration("12.345.678", "event"))!;
  expect(lookup).toMatchObject({ modalidad: "attendee", principal: identity, integrantes: [] });
  const input = exhibitionInput();
  const result = await registerWithModality("event", input, { editToken: lookup.token });
  expect(result).toMatchObject({ id: "student", modalidad: "exhibitor", nombres: "Ana María", email: "actualizado@example.com", numero_cupo_publico: 1, acreditado: true, acreditado_en: "2026-10-27", acreditado_por: "admin", origen: "publica" });
  expect(db.inscripciones).toHaveLength(2);
  expect(db.inscripciones.filter((r) => r.tipo_alta === "principal")).toHaveLength(1);
  expect(db.exposiciones).toHaveLength(1);
  expect(db.integrantes_exposicion).toHaveLength(2);
  expect((await registerWithModality("event", input, { editToken: lookup.token })).id).toBe("student");
  expect(db.exposiciones).toHaveLength(1);
  const recovered = (await findEditableRegistration(identity.documento, "event"))!;
  expect(recovered).toMatchObject({ principal: input.principal, integrantes: [director] });
  expect(JSON.stringify(recovered)).not.toContain("acreditado");
});

it("recupera y edita título e integrantes conservando la misma exposición", async () => {
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  await registerWithModality("event", exhibitionInput(), { editToken: lookup.token });
  const groupId = db.exposiciones[0].id;
  const fresh = (await findEditableRegistration(identity.documento, "event"))!;
  const input = { ...exhibitionInput(), principal: { ...fresh.principal, respuestas: { titulo_trabajo: "Título corregido" } }, integrantes: [{ ...director, documento: "33333333", nombres: "Otra persona" }] };
  await registerWithModality("event", input, { editToken: fresh.token });
  expect(db.exposiciones).toHaveLength(1);
  expect(db.exposiciones[0]).toMatchObject({ id: groupId, respuestas: { titulo_trabajo: "Título corregido" } });
  expect((await findEditableRegistration(identity.documento, "event"))?.integrantes).toEqual(input.integrantes);
  expect(db.integrantes_exposicion).toHaveLength(2);
});

it("rechaza edición concurrente y permisos para otro DNI o evento", async () => {
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  db.inscripciones[0].nombres = "Modificado por administración";
  await expect(registerWithModality("event", exhibitionInput(), { editToken: lookup.token })).rejects.toThrow("cambió desde tu consulta");
  await expect(registerWithModality("event", { ...exhibitionInput(), principal: { ...exhibitionInput().principal, documento: "87654321" } }, { editToken: lookup.token })).rejects.toThrow("Volvé a buscar tu DNI");
  expect(await findEditableRegistration(identity.documento, "otro-evento")).toBeUndefined();
  expect(mocks.send).not.toHaveBeenCalled();
});

it("valida los datos de expositor y no deja una conversión parcial si el batch falla", async () => {
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  await expect(registerWithModality("event", { ...exhibitionInput(), integrantes: [] }, { editToken: lookup.token })).rejects.toThrow("Revisá los datos");
  mocks.send.mockRejectedValue(new ClientResponseError({ status: 400 }));
  await expect(registerWithModality("event", exhibitionInput(), { editToken: lookup.token })).rejects.toThrow("inscripción completa");
  expect(db.inscripciones).toHaveLength(1);
  expect(db.inscripciones[0].modalidad).toBe("attendee");
  expect(db.exposiciones).toHaveLength(0);
});

it.each([{ inscripcion_habilitada: false }, { estado: "finalizado" }, { fin: "2020-01-01" }])("respeta el cierre y finalización al editar: %j", async (change) => {
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  Object.assign(db.eventos[0], change);
  await expect(registerWithModality("event", exhibitionInput(), { editToken: lookup.token })).rejects.toMatchObject({ code: "CLOSED" });
  expect(mocks.send).not.toHaveBeenCalled();
});

it("conserva la exclusividad sin permiso y no da altas nuevas cuando el cupo está completo", async () => {
  await expect(registerWithModality("event", exhibitionInput())).rejects.toMatchObject({ code: "FULL" });
  db.eventos[0].cupo = 10;
  await expect(registerWithModality("event", exhibitionInput())).rejects.toMatchObject({ code: "DUPLICATE" });
  expect(mocks.send).not.toHaveBeenCalled();
});

it("mantiene el formulario original al editar la misma modalidad y usa el publicado al cambiarla", async () => {
  db.modalidades_inscripcion[0].version_publicada = "v-new";
  mocks.version.mockImplementation(async (id: string) => ({ id, esquema: id === "v-exhibitor" ? exhibitorDefinition : id === "v-new" ? { ...attendeeDefinition, fields: exhibitorDefinition.fields } : attendeeDefinition }));
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  expect(lookup.version).toBe("v-attendee");
  expect(lookup.definition?.fields).toHaveLength(0);
  await expect(registerWithModality("event", { modalidad: "attendee", version: lookup.version, operacion: randomUUID(), principal: { ...lookup.principal, nombres: "Ana María" }, integrantes: [] }, { editToken: lookup.token })).resolves.toMatchObject({ version_formulario: "v-attendee" });
});

it("impide cambiar la modalidad de un integrante compartido sin alterar sus exposiciones", async () => {
  db.exposiciones.push({ id: "other-group", evento: "event", responsable: "student", version: "v-exhibitor", modalidad: "exhibitor" });
  db.inscripciones.push({ id: "other-principal", evento: "event", ...identity, documento: "44444444", documento_normalizado: "44444444" });
  db.exposiciones[0].responsable = "other-principal";
  db.integrantes_exposicion.push({ id: "other-link", exposicion: "other-group", participante: "student", funcion: "director" });
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  await expect(registerWithModality("event", exhibitionInput(), { editToken: lookup.token })).rejects.toThrow("vinculada a otras exposiciones");
  expect(db.inscripciones[0].modalidad).toBe("attendee");
  expect(mocks.send).not.toHaveBeenCalled();
});

const secondStudent = { nombres: "Segunda", apellidos: "Alumna", documento: "33333333", email: "segunda@example.com", respuestas: {}, funcion: SECOND_EXHIBITOR_ROLE };
async function registerPair() {
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  await registerWithModality("event", { ...exhibitionInput(), integrantes: [secondStudent, director] }, { editToken: lookup.token });
  return db.inscripciones.find((row) => row.documento === secondStudent.documento)!;
}

it("inscribe al segundo alumno opcional en la misma exposición y lo recupera por DNI con su función y trabajo", async () => {
  const second = await registerPair();
  expect(db.inscripciones).toHaveLength(3);
  expect(second).toMatchObject({ modalidad: "exhibitor", tipo_alta: "vinculada", numero_cupo_publico: 0, acreditado: false });
  expect(db.exposiciones).toHaveLength(1);
  expect(db.integrantes_exposicion).toHaveLength(3);
  const lookup = (await findEditableRegistration("33.333.333", "event"))!;
  expect(lookup).toMatchObject({ linked: true, principal: { nombres: "Segunda", documento: "33333333" }, integrantes: [], participations: [{ role: "Segundo alumno expositor", title: "Mi investigación", principalName: "Pérez, Ana María" }] });
  const before = structuredClone(db);
  await findEditableRegistration(secondStudent.documento, "event");
  expect(db).toEqual(before);
});

it("actualiza los datos del segundo alumno con cupo completo conservando su exposición y acreditación", async () => {
  const second = await registerPair();
  await setAttendance(second.id, true, "admin", "event");
  const beforeGroup = structuredClone(db.exposiciones);
  const beforeLinks = structuredClone(db.integrantes_exposicion);
  const lookup = (await findEditableRegistration(secondStudent.documento, "event"))!;
  const saved = await updatePublicLinkedRegistration("event", { ...secondStudent, nombres: "Segunda María", email: "corregido@example.com" }, lookup.token);
  expect(saved).toMatchObject({ id: second.id, nombres: "Segunda María", email: "corregido@example.com", tipo_alta: "vinculada", numero_cupo_publico: 0, acreditado: true, acreditado_por: "admin" });
  expect(db.exposiciones).toEqual(beforeGroup);
  expect(db.integrantes_exposicion).toEqual(beforeLinks);
  expect(db.inscripciones).toHaveLength(3);
  expect((await findEditableRegistration(secondStudent.documento, "event"))?.linked).toBe(true);
});

it("impide que el segundo alumno cree una segunda exposición desde su consulta o sin permiso", async () => {
  await registerPair();
  const lookup = (await findEditableRegistration(secondStudent.documento, "event"))!;
  db.eventos[0].cupo = 10;
  const input = { ...exhibitionInput(), principal: { ...secondStudent, respuestas: { titulo_trabajo: "Otra exposición" } } };
  await expect(registerWithModality("event", input, { editToken: lookup.token })).rejects.toThrow("como integrante");
  await expect(registerWithModality("event", input)).rejects.toThrow("como segundo alumno expositor");
  expect(db.exposiciones).toHaveLength(1);
});

it("detecta si el responsable cambió o quitó el vínculo mientras el segundo alumno editaba", async () => {
  const second = await registerPair();
  const lookup = (await findEditableRegistration(secondStudent.documento, "event"))!;
  db.exposiciones[0].respuestas = { titulo_trabajo: "Trabajo actualizado" };
  await expect(updatePublicLinkedRegistration("event", secondStudent, lookup.token)).rejects.toThrow("exposición cambió");
  const fresh = (await findEditableRegistration(secondStudent.documento, "event"))!;
  db.integrantes_exposicion = db.integrantes_exposicion.filter((link) => link.participante !== second.id);
  await expect(updatePublicLinkedRegistration("event", secondStudent, fresh.token)).rejects.toThrow("exposición cambió");
});

it("limita la edición del integrante al DNI consultado, al vínculo vigente y al evento abierto", async () => {
  await registerPair();
  const lookup = (await findEditableRegistration(secondStudent.documento, "event"))!;
  await expect(updatePublicLinkedRegistration("event", { ...secondStudent, documento: "44444444" }, lookup.token)).rejects.toThrow("Volvé a buscar tu DNI");
  const principal = (await findEditableRegistration(identity.documento, "event"))!;
  await expect(updatePublicLinkedRegistration("event", principal.principal, principal.token)).rejects.toThrow("inscripción actual");
  db.eventos[0].inscripcion_habilitada = false;
  await expect(updatePublicLinkedRegistration("event", secondStudent, lookup.token)).rejects.toMatchObject({ code: "CLOSED" });
});

it("permite buscar, filtrar y acreditar al segundo alumno de forma individual", async () => {
  const second = await registerPair();
  db.inscripciones[0].acreditado = false;
  const people = await listRegistrations("event", { role: SECOND_EXHIBITOR_ROLE });
  expect(people.map((p) => p.id)).toEqual([second.id]);
  await setAttendance(second.id, true, "staff", "event");
  expect(db.inscripciones.find((row) => row.id === second.id)?.acreditado).toBe(true);
  expect(db.inscripciones[0].acreditado).toBe(false);
  const csv = await participantCsv("event", { role: SECOND_EXHIBITOR_ROLE }, true);
  expect(csv).toContain("Segundo alumno expositor");
  expect(csv).toContain("Alumna,Segunda,33333333");
});

it("actualiza los datos en el formulario anterior a las modalidades sin perder la reserva", async () => {
  delete db.inscripciones[0].modalidad;
  delete db.inscripciones[0].version_formulario;
  mocks.modes.mockResolvedValue([]);
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  const result = await registerPublic(db.eventos[0] as unknown as EventRecord, { ...identity, nombres: "Ana María" }, lookup.token);
  expect(result).toMatchObject({ id: "student", nombres: "Ana María", numero_cupo_publico: 1, acreditado: true });
  expect(db.inscripciones).toHaveLength(1);
});

async function addAnotherWork(title = "Segundo trabajo") {
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  const input = { ...exhibitionInput(), principal: { ...exhibitionInput().principal, respuestas: { titulo_trabajo: title } } };
  await registerWithModality("event", input, { editToken: lookup.token, newExhibition: true });
  return { lookup, input };
}

it("inscribe varios trabajos con el mismo DNI conservando el primer trabajo, integrantes, cupo y acreditación", async () => {
  await registerPair();
  const first = structuredClone(db.exposiciones[0]);
  const links = structuredClone(db.integrantes_exposicion);
  const { lookup, input } = await addAnotherWork();
  expect(lookup.canAddExhibition).toBe(true);
  expect(db.exposiciones).toHaveLength(2);
  expect(db.exposiciones.find((group) => group.id === first.id)).toEqual(first);
  expect(db.integrantes_exposicion.filter((link) => link.exposicion === first.id)).toEqual(links);
  expect(db.inscripciones.filter((person) => person.documento_normalizado === identity.documento)).toHaveLength(1);
  expect(db.inscripciones[0]).toMatchObject({ acreditado: true, numero_cupo_publico: 1, respuestas: { titulo_trabajo: "Mi investigación" } });
  await registerWithModality("event", input, { editToken: lookup.token, newExhibition: true });
  expect(db.exposiciones).toHaveLength(2);
  const recovered = (await findEditableRegistration(identity.documento, "event"))!;
  expect(recovered.exhibitions?.map((group) => group.title).sort()).toEqual(["Mi investigación", "Segundo trabajo"]);
  expect(recovered.exhibitions?.find((group) => group.id === first.id)?.integrantes).toHaveLength(2);
});

it("edita solo el trabajo seleccionado y rechaza selecciones ambiguas, ajenas y consultas antiguas", async () => {
  await registerPair();
  const first = structuredClone(db.exposiciones[0]);
  const { lookup: oldLookup } = await addAnotherWork();
  const second = db.exposiciones.find((group) => group.id !== first.id)!;
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  const input = { ...exhibitionInput(), principal: { ...exhibitionInput().principal, respuestas: { titulo_trabajo: "Segundo corregido" } } };
  await expect(registerWithModality("event", input, { editToken: lookup.token })).rejects.toThrow("Elegí la exposición");
  await expect(registerWithModality("event", input, { editToken: lookup.token, exhibitionId: "foreign" })).rejects.toThrow("no pertenece");
  await expect(registerWithModality("event", input, { editToken: oldLookup.token, exhibitionId: second.id })).rejects.toThrow("cambió desde tu consulta");
  await registerWithModality("event", input, { editToken: lookup.token, exhibitionId: second.id });
  expect(db.exposiciones.find((group) => group.id === first.id)).toEqual(first);
  expect(db.exposiciones.find((group) => group.id === second.id)?.respuestas).toEqual({ titulo_trabajo: "Segundo corregido" });
});

it("mantiene Asistente sin altas duplicadas y no admite nuevos trabajos sin consultar el DNI", async () => {
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  expect(lookup.canAddExhibition).toBe(false);
  await expect(registerWithModality("event", exhibitionInput(), { editToken: lookup.token, newExhibition: true })).rejects.toThrow("disponible para alumnos expositores");
  await expect(registerWithModality("event", exhibitionInput(), { newExhibition: true })).rejects.toThrow("Buscá tu DNI");
  expect(db.inscripciones[0].modalidad).toBe("attendee");
  expect(db.exposiciones).toHaveLength(0);
});

it("permite al segundo alumno inscribir un trabajo propio manteniendo su vínculo anterior y respetando el primer cupo", async () => {
  const second = await registerPair();
  second.origen = "presencial";
  const lookup = (await findEditableRegistration(secondStudent.documento, "event"))!;
  expect(lookup).toMatchObject({ linked: true, canAddExhibition: true });
  const input = { ...exhibitionInput(), principal: { ...lookup.principal, respuestas: { titulo_trabajo: "Trabajo propio del segundo alumno" } } };
  await expect(registerWithModality("event", input, { editToken: lookup.token, newExhibition: true })).rejects.toMatchObject({ code: "FULL" });
  db.eventos[0].cupo = 2;
  await registerWithModality("event", input, { editToken: lookup.token, newExhibition: true });
  expect(db.inscripciones.find((person) => person.id === second.id)).toMatchObject({ tipo_alta: "principal", numero_cupo_publico: 2, origen: "publica" });
  expect(db.exposiciones).toHaveLength(2);
  expect(db.integrantes_exposicion.filter((link) => link.participante === second.id)).toHaveLength(2);
});

it("revierte el alta del trabajo adicional si falla el batch", async () => {
  await registerPair();
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  const before = structuredClone(db);
  mocks.send.mockRejectedValue(new ClientResponseError({ status: 400 }));
  await expect(registerWithModality("event", exhibitionInput(), { editToken: lookup.token, newExhibition: true })).rejects.toThrow("inscripción completa");
  expect(db).toEqual(before);
});

it("mantiene la versión de cada trabajo al publicar nuevos formularios", async () => {
  await registerPair();
  db.modalidades_inscripcion[1].version_publicada = "v-next";
  const nextDefinition = { ...exhibitorDefinition, fields: [{ ...exhibitorDefinition.fields[0], id: "nuevo_titulo" }] };
  mocks.version.mockImplementation(async (id: string) => ({ id, modalidad: "exhibitor", esquema: id === "v-next" ? nextDefinition : exhibitorDefinition }));
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  const input = { ...exhibitionInput(), version: "v-next", principal: { ...exhibitionInput().principal, respuestas: { nuevo_titulo: "Nuevo formulario" } } };
  await registerWithModality("event", input, { editToken: lookup.token, newExhibition: true });
  const recovered = (await findEditableRegistration(identity.documento, "event"))!;
  expect(recovered.exhibitions?.map((group) => group.version).sort()).toEqual(["v-exhibitor", "v-next"]);
  const oldGroup = recovered.exhibitions!.find((group) => group.version === "v-exhibitor")!;
  await registerWithModality("event", exhibitionInput(), { editToken: recovered.token, exhibitionId: oldGroup.id });
  expect(db.exposiciones.find((group) => group.version === "v-next")?.respuestas).toEqual({ nuevo_titulo: "Nuevo formulario" });
});

it("conserva el certificado anterior al inscribir otro trabajo y genera únicamente el nuevo", async () => {
  await registerPair();
  await generateCertificates("event", "admin");
  const original = structuredClone(db.certificados[0]);
  await addAnotherWork();
  expect(db.certificados[0]).toEqual(original);
  expect(await canDownloadModalCertificate(mocks.client as PocketBase, original as never, ["student"])).toBe(true);
  expect(await generateCertificates("event", "admin")).toMatchObject({ created: 1, reused: 1, eligible: 2 });
  expect(db.certificados.find((certificate) => certificate.id === original.id)).toEqual(original);
});

it("conserva la certificación individual de modalidades personalizadas con integrantes", async () => {
  mocks.version.mockImplementation(async (id: string) => ({ id, modalidad: id === "v-exhibitor" ? "exhibitor" : "attendee", esquema: id === "v-exhibitor" ? { ...exhibitorDefinition, certificate: "individual" } : attendeeDefinition }));
  await registerPair();
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  expect(lookup.canAddExhibition).toBe(false);
  await expect(registerWithModality("event", exhibitionInput(), { editToken: lookup.token, newExhibition: true })).rejects.toThrow("certificado grupal");
  expect(await generateCertificates("event", "admin")).toMatchObject({ created: 1, eligible: 1 });
  expect(db.certificados[0]).toMatchObject({ alcance: "individual", exposicion: "" });
  expect((await participantCertificates(mocks.client as PocketBase, db.inscripciones[0] as never, db.eventos[0] as never))).toHaveLength(1);
  expect(await participantCsv("event", {}, true)).toContain("Emitido");
});

it("la administración edita cada exposición por separado y evita sobrescribir todos los trabajos desde acreditación", async () => {
  await registerPair();
  await addAnotherWork();
  const first = structuredClone(db.exposiciones[0]);
  const other = db.exposiciones[1];
  const input = { ...exhibitionInput(), principal: { ...exhibitionInput().principal, respuestas: { titulo_trabajo: "Cambio administrativo" } } };
  await updateExhibition("event", other.id, input, "admin");
  expect(db.exposiciones[0]).toEqual(first);
  expect(db.exposiciones[1].respuestas).toEqual({ titulo_trabajo: "Cambio administrativo" });
  await expect(updateRegistration("event", "student", { ...exhibitionInput().principal, respuestas: { titulo_trabajo: "No sobrescribir" } }, "admin")).rejects.toThrow("desde Exposiciones");
  expect(db.exposiciones[0]).toEqual(first);
  expect(db.exposiciones[1].respuestas).toEqual({ titulo_trabajo: "Cambio administrativo" });
});

it("emite un certificado por trabajo y mantiene separados títulos, destinatarios y acceso después de editar", async () => {
  const second = await registerPair();
  await addAnotherWork();
  expect(await generateCertificates("event", "admin")).toMatchObject({ created: 2, eligible: 2 });
  expect(await generateCertificates("event", "admin")).toMatchObject({ created: 0, reused: 2, eligible: 2 });
  expect(db.certificados).toHaveLength(2);
  const firstGroup = db.exposiciones.find((group) => (group.respuestas as { titulo_trabajo: string }).titulo_trabajo === "Mi investigación")!;
  const firstCert = db.certificados.find((certificate) => certificate.exposicion === firstGroup.id)!;
  const secondCert = db.certificados.find((certificate) => certificate.exposicion !== firstGroup.id)!;
  expect(firstCert.id).not.toBe(secondCert.id);
  expect(mocks.pdf.mock.calls.map(([input]) => input.certificateId).sort()).toEqual(db.certificados.map((certificate) => certificate.id).sort());
  expect(mocks.pdf.mock.calls.map(([input]) => input.registration.respuestas.titulo_trabajo).sort()).toEqual(["Mi investigación", "Segundo trabajo"]);
  const pb = mocks.client as PocketBase;
  const event = db.eventos[0] as unknown as EventRecord;
  const person = db.inscripciones[0] as unknown as import("@/lib/domain/models").RegistrationRecord;
  expect(await participantCertificates(pb, person, event)).toHaveLength(2);
  expect(await canDownloadModalCertificate(pb, firstCert as never, [second.id])).toBe(true);
  expect(await canDownloadModalCertificate(pb, secondCert as never, [second.id])).toBe(false);
  const beforeOtherCertificate = structuredClone(secondCert);
  const lookup = (await findEditableRegistration(identity.documento, "event"))!;
  const input = { ...exhibitionInput(), principal: { ...exhibitionInput().principal, respuestas: { titulo_trabajo: "Mi investigación corregida" } }, integrantes: [secondStudent, director] };
  await registerWithModality("event", input, { editToken: lookup.token, exhibitionId: firstGroup.id });
  expect(db.certificados.find((certificate) => certificate.id === secondCert.id)).toEqual(beforeOtherCertificate);
  expect(await canDownloadModalCertificate(pb, firstCert as never, [person.id])).toBe(false);
  expect(await canDownloadModalCertificate(pb, secondCert as never, [person.id])).toBe(true);
  const rows = await listCertificateRows("event");
  expect(rows.find((row) => row.certificate.id === firstCert.id)?.stale).toBe(true);
  expect(rows.find((row) => row.certificate.id === secondCert.id)?.stale).toBe(false);
  expect(await participantCsv("event", {}, true)).toContain("Mi investigación corregida");
});
