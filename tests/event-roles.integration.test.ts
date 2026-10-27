import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import PocketBase from "pocketbase";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
const requestState = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => requestState.cookie ? { value: requestState.cookie } : undefined, set: (_name: string, value: string) => { requestState.cookie = value; }, delete: () => { requestState.cookie = ""; } }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: (url: string) => { throw new Error("REDIRECT:" + url); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { pocketBaseSchema } from "@/lib/pocketbase/schema";
import { deriveServiceCredentials } from "@/lib/pocketbase/service-credentials";
import { migrateEventRoles } from "@/scripts/migrate-event-roles";
import { sealAdminSession } from "@/lib/auth/session-token";
import { getAuthenticatedStaff, requireAdmin } from "@/lib/auth/session";
import { assignedEventRoles, getEventAccess, getResourceAccess } from "@/lib/auth/event-access";
import { createStaff, saveAssignment, revokeAssignment } from "@/lib/services/staff";
import { createEvent, listEvents } from "@/lib/services/events";
import { listModalities } from "@/lib/services/modalities";
import { createWalkIn, countOccupiedPlaces, registerPublic } from "@/lib/services/registrations";
import { createWalkInAction, toggleAttendanceAction, updateRegistrationAction } from "@/app/actions/registrations";
import { lookupAccreditationAction, confirmAccreditationAction } from "@/app/actions/accreditation";
import { registerConfiguredAction, saveModalityAction } from "@/app/actions/modalities";
import { createEventAction } from "@/app/actions/events";
import { saveAssignmentAction } from "@/app/actions/staff";
import { loginAction } from "@/app/actions/auth";
import { GET as exportParticipants } from "@/app/api/admin/eventos/[id]/exportar/route";
import { GET as downloadMaterial } from "@/app/api/admin/materiales/[id]/route";
import { uploadMaterial } from "@/lib/services/materials";
import { createSpeaker, listSpeakerEventIds, linkSpeakerToEvent, getSpeakerById } from "@/lib/services/speakers";
import { updateSpeakerAction } from "@/app/actions/speakers";

const enabled = process.env.RUN_EVENT_ROLES_INTEGRATION === "1";
const superuser = "test-admin@example.com", password = "TestOnly-Roles-2026!";
const operatorPassword = "TestOnly-Personal-2026!";
const person = (n: number) => ({ nombres: "Persona", apellidos: "Sintética", documento: String(n).padStart(8, "1"), email: `person${n}@example.com` });
function form(data: Record<string, string>) { const f = new FormData(); Object.entries(data).forEach(([k, v]) => f.set(k, v)); return f; }

describe.skipIf(!enabled)("roles por evento contra PocketBase local aislado", () => {
  const pb = new PocketBase("http://127.0.0.1:8099"); pb.autoCancellation(false);
  let general: string, operator: string, empty: string, eventA: Awaited<ReturnType<typeof createEvent>>, eventB: typeof eventA;
  let operatorEmail: string;
  const createdEvents: string[] = [], users: string[] = [];
  async function session(id: string) {
    requestState.cookie = await sealAdminSession({ adminId: id, name: "Prueba local", email: "test@example.com" }, process.env.SESSION_SECRET!);
  }
  async function event(title: string, capacity = 3, legacy = false) {
    const data = { titulo: title, descripcion: "Evento sintético de permisos y acreditación.", slug: "roles-" + randomUUID().slice(0, 8), tipoEvento: "", lugar: "Facultad", inicio: new Date("2030-10-22T12:00:00Z"), fin: new Date("2030-10-22T18:00:00Z"), cupo: capacity, costo: "gratuito" as const, certificadoAsistencia: "si" as const, inscripcionHabilitada: true, estado: "publicado" as const };
    const record = legacy ? await pb.collection("eventos").create({ ...data, inicio: data.inicio.toISOString(), fin: data.fin.toISOString(), inscripcion_habilitada: true, certificado_asistencia: "si" }) as unknown as typeof eventA : await createEvent(data);
    createdEvents.push(record.id); return record;
  }
  beforeAll(async () => {
    if (process.env.POCKETBASE_URL !== pb.baseURL || process.env.POCKETBASE_ADMIN_PASSWORD !== password) throw new Error("Solo base aislada y credenciales sintéticas de roles.");
    await pb.collection("_superusers").authWithPassword(superuser, password);
    // Start with the previous identity shape to exercise the additive migration.
    const old = pocketBaseSchema.filter(c => c.name !== "asignaciones_evento").map(c => c.name === "administradores" ? { ...c, fields: c.fields.map(f => f.name === "role" ? { ...f, values: ["admin"] } : f) } : c);
    await pb.collections.import(old, false);
    await pb.settings.update({ batch: { enabled: true, maxRequests: 100, timeout: 60, maxBodySize: 128 * 1024 * 1024 } });
    const credentials = deriveServiceCredentials({ url: pb.baseURL, adminEmail: superuser, adminPassword: password });
    const serviceRows = await pb.collection("cuentas_servicio").getFullList();
    if (!serviceRows.length) await pb.collection("cuentas_servicio").create({ nombre: "Next local", role: "service", email: credentials.email, password: credentials.password, passwordConfirm: credentials.password });
    const generals = await pb.collection("administradores").getFullList({ filter: 'role = "admin"' });
    general = generals[0]?.id ?? (await pb.collection("administradores").create({ nombre: "General local", role: "admin", email: superuser, password, passwordConfirm: password })).id;
    const before = await pb.collection("administradores").getOne(general);
    await migrateEventRoles(pb, true); await migrateEventRoles(pb, true);
    expect(await pb.collection("administradores").getOne(general)).toMatchObject({ id: before.id, role: "admin", nombre: before.nombre });
    await session(general);
    operatorEmail = `operator-${randomUUID().slice(0, 8)}@example.com`;
    operator = await createStaff({ nombre: "Operador local", email: operatorEmail, password: operatorPassword }); users.push(operator);
    empty = await createStaff({ nombre: "Sin eventos", email: `empty-${randomUUID().slice(0, 8)}@example.com`, password: operatorPassword }); users.push(empty);
    eventA = await event("Evento A de administración"); eventB = await event("Evento B de acreditación");
  }, 30000);
  beforeEach(async () => {
    await session(general);
    await saveAssignment(eventA.id, { usuario: operator, rol: "administrador_evento" });
    await saveAssignment(eventB.id, { usuario: operator, rol: "acreditador" });
  });
  afterAll(async () => {
    for (const id of createdEvents) await pb.collection("eventos").delete(id);
    for (const id of users) await pb.collection("administradores").delete(id);
  });

  it("admite ingreso operativo y general, y conserva la cookie compatible", async () => {
    await expect(loginAction({}, form({ email: operatorEmail, password: operatorPassword }))).rejects.toThrow("REDIRECT:/admin");
    expect(await getAuthenticatedStaff()).toMatchObject({ adminId: operator, role: "personal" });
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
    await expect(loginAction({}, form({ email: superuser, password }))).rejects.toThrow("REDIRECT:/admin");
    expect(await getAuthenticatedStaff()).toMatchObject({ adminId: general, role: "admin" });
  });

  it("aplica distintos roles y no expone eventos ajenos; revoca con la misma cookie", async () => {
    const other = await event("Evento ajeno");
    await session(operator);
    expect(await getEventAccess(eventA.id)).not.toBeNull();
    expect(await getEventAccess(eventB.id)).toBeNull();
    expect(await getEventAccess(eventB.id, "accredit")).not.toBeNull();
    expect(await getEventAccess(other.id, "accredit")).toBeNull();
    const staff = (await getAuthenticatedStaff())!;
    expect((await listEvents([...await assignedEventRoles(staff)].map(([id]) => id))).map(e => e.id).sort()).toEqual([eventA.id, eventB.id].sort());
    const cookie = requestState.cookie;
    await session(general);
    const rows = await pb.collection("asignaciones_evento").getFullList({ filter: pb.filter("evento = {:id}", { id: eventA.id }) });
    await revokeAssignment(eventA.id, rows[0].id);
    requestState.cookie = cookie;
    expect(await getEventAccess(eventA.id)).toBeNull();
    await session(general);
    await saveAssignment(eventA.id, { usuario: operator, rol: "acreditador" });
    requestState.cookie = cookie;
    expect(await getEventAccess(eventA.id)).toBeNull();
    expect(await getEventAccess(eventA.id, "accredit")).not.toBeNull();
    await session(empty);
    expect([...(await assignedEventRoles((await getAuthenticatedStaff())!))]).toEqual([]);
  });

  it("rechaza autoelevación, asignaciones y acceso directo a datos en PocketBase", async () => {
    const direct = new PocketBase(pb.baseURL);
    await direct.collection("administradores").authWithPassword(operatorEmail, operatorPassword);
    await expect(direct.collection("administradores").update(operator, { role: "admin" })).rejects.toThrow();
    await expect(direct.collection("asignaciones_evento").create({ usuario: operator, evento: eventA.id, rol: "administrador_evento" })).rejects.toThrow();
    expect((await direct.collection("eventos").getList()).items).toEqual([]);
    expect((await direct.collection("inscripciones").getList()).items).toEqual([]);
    await session(operator);
    await expect(saveAssignmentAction(eventA.id, {}, form({ usuario: empty, rol: "acreditador" }))).rejects.toThrow("NOT_FOUND");
    await expect(createEventAction({}, new FormData())).rejects.toThrow("NOT_FOUND");
  });

  it("evita duplicados y audita asignaciones sin contraseñas", async () => {
    await expect(createStaff({ nombre: "Duplicado", email: operatorEmail, password: operatorPassword })).rejects.toThrow();
    const rows = await pb.collection("asignaciones_evento").getFullList({ filter: pb.filter("evento = {:event} && usuario = {:user}", { event: eventA.id, user: operator }) });
    expect(rows).toHaveLength(1);
    await expect(pb.collection("asignaciones_evento").create({ evento: eventA.id, usuario: operator, rol: "acreditador" })).rejects.toThrow();
    const audits = await pb.collection("auditoria").getFullList({ filter: pb.filter('entidad_id = {:id} && accion = "personal.creado"', { id: operator }) });
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits)).not.toContain(operatorPassword);
  });

  it("permite acreditar pero bloquea edición, configuración y recursos cruzados", async () => {
    const registration = await registerPublic(eventB, person(20));
    await session(operator);
    await toggleAttendanceAction(form({ eventId: eventB.id, registrationId: registration.id, accredited: "true" }));
    expect(await pb.collection("inscripciones").getOne(registration.id)).toMatchObject({ acreditado: true, acreditado_por: operator });
    await expect(updateRegistrationAction(eventB.id, registration.id, {}, form(person(20)))).rejects.toThrow("NOT_FOUND");
    await expect(saveModalityAction(eventB.id, {}, new FormData())).rejects.toThrow("NOT_FOUND");
    await expect(toggleAttendanceAction(form({ eventId: eventA.id, registrationId: registration.id, accredited: "false" }))).rejects.toThrow("no pertenece");
    const response = await exportParticipants(new NextRequest(`http://localhost/api/admin/eventos/${eventB.id}/exportar`), { params: Promise.resolve({ id: eventB.id }) });
    expect(response.status).toBe(401);
    const material = await uploadMaterial(eventB.id, "Archivo de prueba", new File(["sintetico"], "material.pdf", { type: "application/pdf" }), general);
    expect(await getResourceAccess("materiales_evento", material.id)).toBeNull();
    expect((await downloadMaterial(new Request("http://localhost/"), { params: Promise.resolve({ id: material.id }) })).status).toBe(401);
  });

  it("el acreditador busca por DNI, corrige y confirma sin cambiar modalidad ni duplicar llegada", async () => {
    const e = await event("Acreditación rápida", 1);
    await saveAssignment(e.id, { usuario: operator, rol: "acreditador" });
    const data = person(71);
    const registration = await registerPublic(e, data);
    await session(operator);
    const lookup = await lookupAccreditationAction(e.id, data.documento.slice(0, 2) + "." + data.documento.slice(2));
    expect(lookup.person).toMatchObject({ id: registration.id, acreditado: false });
    expect(lookup.person).not.toHaveProperty("respuestas");
    expect((await confirmAccreditationAction(e.id, registration.id, {}, form({ ...data, nombres: "Nombre corregido" }))).ok).toBe(true);
    const saved = await pb.collection("inscripciones").getOne(registration.id);
    expect(saved).toMatchObject({ nombres: "Nombre corregido", modalidad: registration.modalidad, numero_cupo_publico: registration.numero_cupo_publico, acreditado: true, acreditado_por: operator });
    expect((await confirmAccreditationAction(e.id, registration.id, {}, form({ ...data, nombres: "Nombre corregido" }))).ok).toBe(true);
    expect((await pb.collection("inscripciones").getOne(registration.id)).acreditado_en).toBe(saved.acreditado_en);
    expect((await lookupAccreditationAction(eventB.id, data.documento)).person).toBeUndefined();
    expect((await confirmAccreditationAction(eventB.id, registration.id, {}, form(data))).ok).not.toBe(true);
    const audits = await pb.collection("auditoria").getFullList({ filter: pb.filter('entidad_id = {:id} && accion = "asistencia.acreditada"', { id: registration.id }) });
    expect(audits).toHaveLength(1);
    await session(general);
    await revokeAssignment(e.id, (await pb.collection("asignaciones_evento").getFirstListItem(pb.filter("evento = {:id}", { id: e.id }))).id);
    await session(operator);
    await expect(lookupAccreditationAction(e.id, data.documento)).rejects.toThrow("NOT_FOUND");
    await expect(confirmAccreditationAction(e.id, registration.id, {}, form(data))).rejects.toThrow("NOT_FOUND");
  });

  it.each([false, true])("protege el último lugar presencial y la excepción manipulada; heredado=%s", async legacy => {
    const e = await event("Último lugar", 1, legacy);
    await saveAssignment(e.id, { usuario: operator, rol: "acreditador" });
    await session(operator);
    const results = await Promise.all([40, 41].map(n => createWalkInAction(e.id, {}, form({ ...person(n), confirmarExcepcion: "on" }))));
    expect(results.filter(r => r.ok)).toHaveLength(1);
    expect(await countOccupiedPlaces(e.id)).toBe(1);
    expect(results.find(r => !r.ok)?.message).toContain("cupo");
    await session(general);
    const exceptional = await createWalkIn(e.id, person(42), general, true);
    expect(exceptional.origen).toBe("presencial");
    expect(await countOccupiedPlaces(e.id)).toBe(2);
  });

  it("el formulario por modalidad tampoco concede una excepción manipulada", async () => {
    const e = await event("Modalidad con cupo", 1);
    await saveAssignment(e.id, { usuario: operator, rol: "acreditador" });
    await createWalkIn(e.id, person(50), general);
    const mode = (await listModalities(e.id))[0];
    await session(operator);
    const payload = { modalidad: mode.id, version: mode.version_publicada, operacion: randomUUID(), principal: { ...person(51), respuestas: {} }, integrantes: [] };
    const result = await registerConfiguredAction(e.id, true, {}, form({ payload: JSON.stringify(payload), confirmarExcepcion: "on" }));
    expect(result.ok).not.toBe(true); expect(result.message).toContain("cupo");
    expect(await countOccupiedPlaces(e.id)).toBe(1);
  });

  it("admite cupo ilimitado y libera el bloqueo después de un alta duplicada", async () => {
    const e = await event("Sin límite presencial", 1);
    await pb.collection("eventos").update(e.id, { cupo_ilimitado: true });
    await saveAssignment(e.id, { usuario: operator, rol: "acreditador" });
    await session(operator);
    expect((await createWalkInAction(e.id, {}, form(person(60)))).ok).toBe(true);
    expect((await createWalkInAction(e.id, {}, form(person(60)))).ok).not.toBe(true);
    expect((await createWalkInAction(e.id, {}, form(person(61)))).ok).toBe(true);
    expect(await countOccupiedPlaces(e.id)).toBe(2);
    const locks = await pb.collection("bloqueos_operacion").getFullList({ filter: pb.filter("clave = {:key}", { key: "evento:" + e.id }) });
    expect(locks).toHaveLength(0);
  });

  it("una edición local de disertante no modifica el perfil de otro evento", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");
    const speaker = await createSpeaker(eventA.id, { titulo: "Ing.", nombre: "Perfil original", universidades: "UNCA" }, new File([png], "foto.png", { type: "image/png" }));
    await linkSpeakerToEvent(eventB.id, speaker.id);
    await session(operator);
    await expect(updateSpeakerAction(eventA.id, speaker.id, {}, form({ titulo: "Ing.", nombre: "Perfil local", universidades: "UNCA" }))).rejects.toThrow("REDIRECT:");
    expect((await getSpeakerById(speaker.id))?.nombre).toBe("Perfil original");
    expect(await listSpeakerEventIds(speaker.id)).toEqual([eventB.id]);
    const localLinks = await pb.collection("participaciones_disertantes").getFullList({ filter: pb.filter("evento = {:id}", { id: eventA.id }) });
    expect((await getSpeakerById(localLinks[0].disertante))?.nombre).toBe("Perfil local");
    const audits = await pb.collection("auditoria").getFullList({ filter: pb.filter('entidad_id = {:id} && accion = "disertante.actualizado"', { id: localLinks[0].disertante }) });
    expect(audits).toHaveLength(1);
    expect(audits[0].datos).toMatchObject({ evento: eventA.id, perfilOrigen: speaker.id });
  });
});
