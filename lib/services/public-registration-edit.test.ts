import PocketBase, { ClientResponseError } from "pocketbase";
import { randomUUID } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { attendeeDefinition, exhibitorDefinition, SECOND_EXHIBITOR_ROLE } from "@/lib/domain/modalities";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ client: null as unknown, version: vi.fn(), modes: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ SESSION_SECRET: "public-registration-tests-secret" }) }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => mocks.client }));
vi.mock("./operation-lock", () => ({ withOperationLock: async (_pb: unknown, _key: string, run: (assert: () => Promise<void>) => Promise<unknown>) => run(async () => {}) }));
vi.mock("./modalities", () => ({ modalityVersion: mocks.version, listModalities: mocks.modes }));
vi.mock("./events", () => ({ getEventById: async () => db.eventos[0] }));
vi.mock("./audit", () => ({ audit: async () => {} }));
import { findEditableRegistration, updatePublicLinkedRegistration } from "./public-registration-edit";
import { registerWithModality } from "./modal-registration";
import { registerPublic, setAttendance, listRegistrations } from "./registrations";
import { participantCsv } from "./participant-reports";
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
    const match = /^(\w+) = "([^"]*)"$/.exec(term);
    if (!match) throw new Error("Filtro inesperado: " + term);
    return row[match[1]] === match[2];
  }))));
}

beforeEach(() => {
  vi.resetAllMocks();
  db = {
    eventos: [{ id: "event", estado: "publicado", inscripcion_habilitada: true, fin: "2099-01-01", cupo: 1 }],
    modalidades_inscripcion: [
      { id: "attendee", evento: "event", habilitada: true, version_publicada: "v-attendee", codigo: "asistente" },
      { id: "exhibitor", evento: "event", habilitada: true, version_publicada: "v-exhibitor" },
    ],
    inscripciones: [{ id: "student", evento: "event", ...identity, documento_normalizado: identity.documento, modalidad: "attendee", version_formulario: "v-attendee", respuestas: {}, tipo_alta: "principal", origen: "publica", numero_cupo_publico: 1, acreditado: true, acreditado_en: "2026-10-27", acreditado_por: "admin" }],
    exposiciones: [], integrantes_exposicion: [], operaciones_inscripcion: [],
  };
  mocks.version.mockImplementation(async (id: string) => ({ id, esquema: id === "v-exhibitor" ? exhibitorDefinition : attendeeDefinition }));
  mocks.modes.mockImplementation(async () => db.modalidades_inscripcion);
  mocks.client = {
    filter: new PocketBase().filter,
    collection: (name: string) => ({
      getFullList: async (options: { filter?: string }) => filtered(name, options),
      getList: async (_page: number, _size: number, options: { filter?: string }) => ({ items: filtered(name, options).slice(0, 1) }),
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
