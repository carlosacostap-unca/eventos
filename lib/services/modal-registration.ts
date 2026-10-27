import "server-only";
import { ClientResponseError } from "pocketbase";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { DomainError } from "@/lib/domain/errors";
import { fingerprint, recordId } from "@/lib/domain/fingerprints";
import { normalizeDocument, type EventRecord, type RegistrationRecord } from "@/lib/domain/models";
import { coherentIdentity, parseSubmission, SECOND_EXHIBITOR_ROLE, type Modality, type Exhibition, type ExhibitionMember } from "@/lib/domain/modalities";
import { getRegistrationAvailability, isCapacityFull, nextPublicSlot, publicCapacity } from "@/lib/domain/events";
import { modalityVersion } from "./modalities";
import { withOperationLock } from "./operation-lock";
import { verifyRegistrationEdit } from "@/lib/registrations/public-edit-access";
import { registrationEditSnapshot } from "./public-registration-edit";
import { preparePresentation } from "./presentation-files";
import { deadlinePassed } from "@/lib/domain/modality-deadlines";

function assertDeadlines(mode: Modality, hasPresentation: boolean) {
  if (deadlinePassed(mode.inscripcion_hasta)) throw new DomainError("CLOSED", "La inscripción de esta modalidad ya cerró. Si ya inscribiste tu trabajo, usá la sección de presentaciones para entregar el archivo dentro de su plazo.");
  if (hasPresentation && deadlinePassed(mode.presentaciones_hasta)) throw new DomainError("CLOSED", "El plazo para entregar o reemplazar presentaciones ya terminó.");
}

export async function registerWithModality(eventId: string, raw: unknown, options: { presencial?: boolean; allowOverCapacity?: boolean; strictCapacity?: boolean; adminId?: string; editToken?: string; exhibitionId?: string; newExhibition?: boolean; presentation?: File; presentationRevision?: string } = {}): Promise<RegistrationRecord> {
  const presentation = options.presentation ? await preparePresentation(options.presentation) : undefined;
  const pb = await createServicePocketBase();
  return withOperationLock(pb, "evento:" + eventId, async (assertOwned) => {
    const event = await pb.collection("eventos").getOne<EventRecord>(eventId);
    const modeId = String((raw as Record<string, unknown>)?.modalidad ?? "");
    const mode = await pb.collection("modalidades_inscripcion").getOne<Modality>(modeId);
    if (mode.evento !== eventId || !mode.habilitada) throw new DomainError("CLOSED", "La modalidad no está disponible.");
    if (presentation && mode.codigo !== "expositor") throw new DomainError("INVALID", "La presentación final está disponible solamente para trabajos de expositores.");
    const rawPrincipal = (raw as { principal?: { documento?: unknown } })?.principal;
    const access = options.editToken ? await verifyRegistrationEdit(options.editToken, eventId, normalizeDocument(String(rawPrincipal?.documento ?? ""))) : undefined;
    if (access && options.presencial) throw new DomainError("INVALID", "La edición pública no permite acreditar personas.");
    const current = access ? await pb.collection("inscripciones").getOne<RegistrationRecord>(access.registrationId) : undefined;
    if (current && (current.evento !== eventId || current.documento_normalizado !== access!.document)) throw new DomainError("INVALID", "Volvé a buscar tu DNI en el formulario del evento.");
    if ((options.newExhibition || options.exhibitionId) && !access) throw new DomainError("INVALID", "Buscá tu DNI antes de elegir una exposición.");
    if (options.newExhibition && options.exhibitionId) throw new DomainError("INVALID", "Elegí editar una exposición o inscribir otro trabajo.");
    const snapshot = current ? await registrationEditSnapshot(current) : undefined;
    const previousGroup = options.newExhibition ? undefined : options.exhibitionId ? snapshot?.groups.find((g) => g.id === options.exhibitionId) : snapshot?.groups.length === 1 ? snapshot.groups[0] : undefined;
    if (options.exhibitionId && !previousGroup) throw new DomainError("INVALID", "La exposición no pertenece a tu inscripción.");
    if (options.newExhibition && (!current || current.modalidad !== mode.id || mode.codigo !== "expositor" || !(snapshot!.groups.length || snapshot!.otherMemberships.some((m) => m.funcion === SECOND_EXHIBITOR_ROLE)))) throw new DomainError("INVALID", "La inscripción de otro trabajo está disponible para alumnos expositores de esta modalidad.");
    if (!options.newExhibition && snapshot && snapshot.groups.length > 1 && !previousGroup) throw new DomainError("INVALID", "Elegí la exposición que querés modificar.");
    if (snapshot && snapshot.groups.length > 1 && current!.modalidad !== mode.id) throw new DomainError("INVALID", "Tenés varias exposiciones. Consultá con la organización para cambiar de modalidad.");
    const version = await modalityVersion(previousGroup && current?.modalidad === mode.id ? previousGroup.version : !options.newExhibition && current?.modalidad === mode.id && current.version_formulario ? current.version_formulario : mode.version_publicada);
    if (options.newExhibition && version.esquema.certificate !== "grupo") throw new DomainError("INVALID", "La modalidad debe estar configurada para exposiciones con certificado grupal.");
    if ((raw as Record<string, unknown>)?.version !== version.id) throw new DomainError("INVALID", "El formulario cambió. Actualizá la página antes de inscribirte.");
    const input = parseSubmission(version.esquema, raw);
    const signature = fingerprint({ input, presencial: !!options.presencial, ...(access ? { editToken: options.editToken } : {}), ...(options.exhibitionId ? { exhibitionId: options.exhibitionId } : {}), ...(options.newExhibition ? { newExhibition: true } : {}), ...(presentation ? { presentation: { hash: presentation.data.presentacion_huella, name: presentation.data.presentacion_nombre } } : {}) });
    const operations = await pb.collection("operaciones_inscripcion").getFullList({ filter: pb.filter("evento = {:eventId} && clave = {:key}", { eventId, key: input.operacion }) });
    if (operations[0]) {
      if (operations[0].huella !== signature) throw new DomainError("INVALID", "La solicitud ya fue utilizada con otros datos.");
      return pb.collection("inscripciones").getOne<RegistrationRecord>(operations[0].participante);
    }
    assertDeadlines(mode, !!presentation);
    if (presentation && previousGroup && (previousGroup.presentacion_huella || previousGroup.presentacion_final || "") !== (options.presentationRevision ?? "")) throw new DomainError("INVALID", "La presentación cambió desde tu consulta. Volvé a buscar tu DNI antes de reemplazarla.");
    const all = await pb.collection("inscripciones").getFullList<RegistrationRecord>({ filter: pb.filter("evento = {:eventId}", { eventId }) });
    const editing = access ? all.find((r) => r.id === access.registrationId && r.documento_normalizado === access.document) : undefined;
    if (access && !editing) throw new DomainError("NOT_FOUND", "La inscripción ya no está disponible. Volvé a buscar tu DNI.");
    if (snapshot && snapshot.revision !== access!.revision) throw new DomainError("INVALID", "La inscripción cambió desde tu consulta. Volvé a buscar tu DNI para recuperar los datos actualizados.");
    if (!options.newExhibition && editing?.tipo_alta === "vinculada" && snapshot?.otherMemberships.length) throw new DomainError("INVALID", "Ya estás inscripto como integrante de una exposición. Podés modificar tus datos desde la consulta por DNI.");
    if (snapshot && editing!.modalidad !== mode.id && snapshot.otherMemberships.length) throw new DomainError("INVALID", "Tu inscripción está vinculada a otras exposiciones. Consultá con la organización para cambiar la modalidad.");
    const keepsPlace = editing && editing.tipo_alta !== "vinculada";
    const publicPrincipals = all.filter((r) => r.origen === "publica" && r.tipo_alta !== "vinculada");
    if (options.presencial && options.strictCapacity && isCapacityFull(event, all.filter(r => r.tipo_alta !== "vinculada").length)) {
      throw new DomainError("FULL", "El cupo del evento está completo. No se pueden agregar más personas.");
    }
    if (!options.presencial) {
      const availability = getRegistrationAvailability(event, keepsPlace ? 0 : publicPrincipals.length);
      // Una edición conserva el lugar aun con el cupo completo.
      if (availability !== "disponible") throw new DomainError(availability === "completo" ? "FULL" : "CLOSED", availability === "completo" ? "El cupo del evento está completo." : "La inscripción no está disponible.");
    } else if (isCapacityFull(event, publicPrincipals.length) && !options.allowOverCapacity) throw new DomainError("CONFIRMATION_REQUIRED", "Confirmá que querés superar el cupo público.");
    const slot = keepsPlace ? editing.numero_cupo_publico : options.presencial ? 0 : nextPublicSlot(publicPrincipals.map((p) => p.numero_cupo_publico), publicCapacity(event));
    if (slot === null) throw new DomainError("FULL", "El cupo del evento está completo.");
    const batch = pb.createBatch();
    const people = [input.principal, ...input.integrantes];
    const ids: string[] = [];
    for (const [index, person] of people.entries()) {
      const document = normalizeDocument(person.documento);
      const existing = all.find((r) => r.documento_normalizado === document);
      if (index === 0 && existing?.tipo_alta === "vinculada" && !editing) {
        const memberships = await pb.collection("integrantes_exposicion").getFullList({ filter: pb.filter("participante = {:id} && funcion = {:role}", { id: existing.id, role: SECOND_EXHIBITOR_ROLE }) });
        if (memberships.length) throw new DomainError("DUPLICATE", "Ya estás inscripto como segundo alumno expositor. Buscá tu DNI para consultar tu exposición y modificar tus datos.");
      }
      const editsPrincipal = index === 0 && existing?.id === editing?.id && Boolean(editing);
      if (existing && !editsPrincipal && (existing.modalidad !== mode.id || !coherentIdentity(existing, person))) throw new DomainError("DUPLICATE", "Un DNI ya está registrado en otra modalidad o con datos diferentes. Consultá con la organización.");
      if (existing && index === 0 && existing.tipo_alta !== "vinculada" && !editsPrincipal) throw new DomainError("DUPLICATE", "Ya estás inscripto en este evento. Buscá tu DNI para actualizar la inscripción.");
      const id = existing?.id ?? recordId();
      ids.push(id);
      const principalData: Record<string, unknown> = { tipo_alta: "principal", numero_cupo_publico: slot, version_formulario: version.id, respuestas: person.respuestas, ...(editsPrincipal ? { modalidad: mode.id, nombres: person.nombres, apellidos: person.apellidos, documento: person.documento, documento_normalizado: document, email: person.email } : {}), ...(options.presencial ? { acreditado: true, acreditado_en: new Date().toISOString(), acreditado_por: options.adminId ?? "", origen: "presencial" } : {}) };
      if (index === 0 && options.newExhibition && editing?.tipo_alta === "vinculada") principalData.origen = "publica";
      if (!existing) batch.collection("inscripciones").create({ id, evento: eventId, modalidad: mode.id, nombres: person.nombres, apellidos: person.apellidos, documento: person.documento, documento_normalizado: document, email: person.email, origen: options.presencial ? "presencial" : "publica", tipo_alta: "vinculada", numero_cupo_publico: 0, acreditado: false, ...(index === 0 ? principalData : {}) });
      else if (index === 0) {
        if (editing && editing.tipo_alta !== "vinculada" && (options.newExhibition || (snapshot?.groups.length ?? 0) > 1)) {
          // Cada exposición guarda sus respuestas y versión; la identidad es común.
          delete principalData.version_formulario;
          delete principalData.respuestas;
        }
        batch.collection("inscripciones").update(id, principalData);
      }
    }
    const exhibitionId = version.esquema.certificate === "grupo" || input.integrantes.length ? previousGroup?.id ?? recordId() : "";
    if (presentation && !exhibitionId) throw new DomainError("INVALID", "La modalidad debe permitir registrar un trabajo para adjuntar la presentación.");
    if (options.newExhibition && !exhibitionId) throw new DomainError("INVALID", "La modalidad debe permitir registrar exposiciones.");
    for (const link of snapshot?.links.filter((m) => m.exposicion === previousGroup?.id) ?? []) batch.collection("integrantes_exposicion").delete(link.id);
    if (previousGroup && !exhibitionId) batch.collection("exposiciones").delete(previousGroup.id);
    if (exhibitionId) {
      const groupData = { evento: eventId, modalidad: mode.id, version: version.id, responsable: ids[0], respuestas: input.principal.respuestas, ...(presentation ? { presentacion_final: presentation.file, ...presentation.data } : {}) };
      if (previousGroup) batch.collection("exposiciones").update(exhibitionId, groupData);
      else batch.collection("exposiciones").create({ id: exhibitionId, ...groupData });
      people.forEach((person, index) => {
        const role = index ? version.esquema.roles.find((r) => r.id === input.integrantes[index - 1].funcion)! : null;
        batch.collection("integrantes_exposicion").create({ exposicion: exhibitionId, participante: ids[index], funcion: role?.id ?? "principal", etiqueta: role?.label ?? version.esquema.principal, orden: index, respuestas: person.respuestas });
      });
    }
    batch.collection("operaciones_inscripcion").create({ evento: eventId, clave: input.operacion, huella: signature, participante: ids[0], exposicion: exhibitionId });
    if (options.adminId) batch.collection("auditoria").create({ administrador: options.adminId, accion: "inscripcion.presencial", entidad: "inscripcion", entidad_id: ids[0], datos: { evento: eventId, modalidad: mode.id } });
    await assertOwned();
    assertDeadlines(mode, !!presentation);
    try { await batch.send(); }
    catch (error) { if (error instanceof ClientResponseError && [400, 403, 404].includes(error.status)) throw new DomainError("INVALID", "No se pudo confirmar la inscripción completa. Verificá los datos o consultá con la organización."); throw error; }
    return pb.collection("inscripciones").getOne<RegistrationRecord>(ids[0]);
  });
}

export async function eventExhibitions(eventId: string) {
  const pb = await createServicePocketBase();
  try {
    const exhibitions = await pb.collection("exposiciones").getFullList<Exhibition>({ filter: pb.filter("evento = {:id}", { id: eventId }) });
    const members = exhibitions.length ? await pb.collection("integrantes_exposicion").getFullList<ExhibitionMember>({ filter: exhibitions.map((g) => pb.filter("exposicion = {:id}", { id: g.id })).join(" || "), sort: "orden" }) : [];
    return { exhibitions, members };
  } catch (e) { if (e instanceof ClientResponseError && e.status === 404) return { exhibitions: [], members: [] }; throw e; }
}
