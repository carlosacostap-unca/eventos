"use client";
import { useActionState, useState, type Dispatch, type SetStateAction } from "react";
import { registerConfiguredAction } from "@/app/actions/modalities";
import type { Answers, PersonSubmission, PublicModality } from "@/lib/domain/modalities";
import { ConfiguredFields } from "./configured-fields";
import { FormMessage, FieldError } from "./form-feedback";
import { initialActionState } from "@/app/actions/state";
import type { ActionState } from "@/app/actions/state";
import { PersonFields } from "./registration-person-fields";
import type { EditableRegistration, RegistrationPrefillResult } from "@/lib/domain/registration-prefill";
import { ExhibitionMemberships, LinkedRegistrationForm } from "./linked-registration-form";

const emptyPerson = (): PersonSubmission => ({ nombres: "", apellidos: "", documento: "", email: "", respuestas: {} });
export function ModalRegistrationForm({ eventId, modes, operation, presencial = false, isFull = false }: { eventId: string; modes: PublicModality[]; operation: string; presencial?: boolean; isFull?: boolean }) {
  if (!presencial) return <PublicModalRegistrationForm eventId={eventId} modes={modes} operation={operation} />;
  return <WalkInModalRegistrationForm eventId={eventId} modes={modes} operation={operation} isFull={isFull} />;
}

function PublicModalRegistrationForm({ eventId, modes, operation }: { eventId: string; modes: PublicModality[]; operation: string }) {
  const [selected, setSelected] = useState(modes[0]?.id ?? "");
  const [person, setPerson] = useState(emptyPerson);
  const [ready, setReady] = useState(false);
  const [registration, setRegistration] = useState<EditableRegistration>();
  const [lookupVersion, setLookupVersion] = useState(0);
  const [lookupMessage, setLookupMessage] = useState("");
  const publishedMode = modes.find((m) => m.id === selected);
  const mode = publishedMode && registration?.modalidad === selected && registration.definition ? { ...publishedMode, version: registration.version, definition: registration.definition } : publishedMode;
  if (!mode) return <div className="panel">No hay modalidades de inscripción disponibles.</div>;
  function lookedUp(result: RegistrationPrefillResult) {
    setRegistration(result.registration);
    setLookupMessage(result.message);
    if (result.registration && modes.some((m) => m.id === result.registration!.modalidad)) setSelected(result.registration.modalidad);
    setLookupVersion((value) => value + 1);
  }
  function identityReady(value: boolean) {
    setReady(value);
    if (!value) setLookupMessage("");
  }
  const sameMode = ready && registration?.modalidad === selected;
  const allowedAnswers = (value: Answers, ids: string[]) => Object.fromEntries(Object.entries(value).filter(([id]) => ids.includes(id)));
  const initial = {
    principal: { ...person, respuestas: sameMode ? allowedAnswers(registration.principal.respuestas, mode.definition.fields.map((f) => f.id)) : {} },
    integrantes: sameMode ? mode.definition.roles.flatMap((role) => {
      const saved = registration.integrantes.filter((p) => p.funcion === role.id).slice(0, role.max).map((p) => ({ ...p, respuestas: allowedAnswers(p.respuestas, role.fields.map((f) => f.id)) }));
      return [...saved, ...Array.from({ length: Math.max(0, role.min - saved.length) }, () => ({ ...emptyPerson(), funcion: role.id }))];
    }) : mode.definition.roles.flatMap((role) => Array.from({ length: role.min }, () => ({ ...emptyPerson(), funcion: role.id }))),
  };
  return <div className="panel form-stack">
    <h2>Inscribite o actualizá tu inscripción</h2>
    <p className="muted">{registration?.linked ? "Consultá tu exposición y revisá tus datos de inscripción." : "Primero ingresá tu DNI. Si ya estás inscripto en este evento, podrás revisar tus datos y cambiar la modalidad."}</p>
    {registration?.linked ? <LinkedRegistrationForm key={lookupVersion} eventId={eventId} registration={registration} person={person} setPerson={setPerson} ready={ready} message={lookupMessage} onLookup={lookedUp} onReadyChange={identityReady} /> : <ConfiguredForm key={selected + "-" + lookupVersion} eventId={eventId} mode={mode} operation={operation + "-" + selected + "-" + lookupVersion} presencial={false} isFull={false} initial={initial}
      publicIdentity={{ person, setPerson, ready, lookupMessage, onLookup: lookedUp, onReadyChange: identityReady, editToken: ready ? registration?.token : undefined }}
      modeSelector={ready ? <>
        {registration?.participations?.length ? <ExhibitionMemberships participations={registration.participations} /> : null}
        {modes.length > 1 && <label className="field"><span>Modalidad de inscripción</span><select value={selected} onChange={(e) => setSelected(e.target.value)}>{modes.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>}
      </> : undefined} />}
  </div>;
}

function WalkInModalRegistrationForm({ eventId, modes, operation, isFull }: { eventId: string; modes: PublicModality[]; operation: string; isFull: boolean }) {
  const [selected, setSelected] = useState(modes[0]?.id ?? "");
  const mode = modes.find((m) => m.id === selected);
  if (!mode) return <div className="panel">No hay modalidades de inscripción disponibles.</div>;
  return <div className="panel form-stack">
    <h2>Agregar y acreditar</h2>
    {modes.length > 1 && <label className="field"><span>Modalidad de inscripción</span><select value={selected} onChange={(e) => setSelected(e.target.value)}>{modes.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>}
    <ConfiguredForm key={selected} eventId={eventId} mode={mode} operation={operation + "-" + selected} presencial={true} isFull={isFull} />
  </div>;
}
export function ConfiguredForm({ eventId, mode, operation, presencial, isFull, initial, saveAction, publicIdentity, modeSelector }: { eventId: string; mode: PublicModality; operation: string; presencial: boolean; isFull: boolean; initial?: { principal: PersonSubmission; integrantes: Array<PersonSubmission & { funcion: string }> }; saveAction?: (state: ActionState, data: FormData) => Promise<ActionState>; publicIdentity?: { person: PersonSubmission; setPerson: Dispatch<SetStateAction<PersonSubmission>>; ready: boolean; lookupMessage: string; onLookup: (result: RegistrationPrefillResult) => void; onReadyChange: (ready: boolean) => void; editToken?: string }; modeSelector?: React.ReactNode }) {
  const [principal, setPrincipal] = useState(() => initial?.principal ?? emptyPerson());
  const [principalReady, setPrincipalReady] = useState(Boolean(initial));
  const [members, setMembers] = useState(() => (initial?.integrantes ?? mode.definition.roles.flatMap((role) => Array.from({ length: role.min }, () => ({ ...emptyPerson(), funcion: role.id })))).map((person) => ({ ...person, formKey: crypto.randomUUID() })));
  const [state, action, pending] = useActionState(saveAction ?? registerConfiguredAction.bind(null, eventId, presencial), initialActionState);
  const payload = { modalidad: mode.id, version: mode.version, operacion: operation, principal: publicIdentity ? { ...publicIdentity.person, respuestas: principal.respuestas } : principal, integrantes: members.map(({ nombres, apellidos, documento, email, respuestas, funcion }) => ({ nombres, apellidos, documento, email, respuestas, funcion })) };
  const identityReady = publicIdentity ? publicIdentity.ready : principalReady || saveAction;
  function answers(index: number, value: Answers) { setMembers(members.map((p, i) => i === index ? { ...p, respuestas: value } : p)); }
  return <form action={action} className="form-stack" onSubmit={(event) => {
    const unresolved = event.currentTarget.querySelector<HTMLInputElement>('[data-identity-unresolved="true"]');
    if (unresolved) { event.preventDefault(); unresolved.focus(); }
  }}>
    <FormMessage message={state.message} success={state.ok} />
    <FieldError errors={state.fields?.formulario} />
    {!state.ok && <>
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {publicIdentity?.editToken && <input type="hidden" name="editToken" value={publicIdentity.editToken} />}
      <h3>{publicIdentity ? "Tus datos" : mode.definition.principal}</h3>
      {publicIdentity ? <PersonFields person={publicIdentity.person} setPerson={publicIdentity.setPerson} prefix="principal" errors={state.fields} eventId={eventId} initialReady={publicIdentity.ready} initialMessage={publicIdentity.lookupMessage} includeRegistration onLookup={publicIdentity.onLookup} onReadyChange={publicIdentity.onReadyChange} /> : <PersonFields person={principal} setPerson={setPrincipal} prefix="principal" errors={state.fields} eventId={saveAction ? undefined : eventId} onReadyChange={setPrincipalReady} />}
      {identityReady && <>
      {modeSelector}
      <ConfiguredFields fields={mode.definition.fields} values={principal.respuestas} onChange={(respuestas) => setPrincipal({ ...principal, respuestas })} prefix="principal.respuestas" errors={state.fields} />
      {mode.definition.roles.map((role) => <section className="form-stack member-section" key={role.id}>
        <h3>{role.label} {role.min > 0 ? "(obligatorio)" : "(opcional)"}</h3>
        <FieldError errors={state.fields?.["grupo." + role.id]} />
        {members.map((p, i) => p.funcion !== role.id ? null : <fieldset className="form-stack" key={p.formKey}><legend>{role.label} {role.max > 1 ? members.slice(0, i + 1).filter((m) => m.funcion === role.id).length : ""}</legend>
          <PersonFields person={p} setPerson={(update) => setMembers((current) => current.map((m) => m.formKey === p.formKey ? { ...m, ...(typeof update === "function" ? update(m) : update), funcion: role.id } : m))} prefix={`integrantes.${i}`} errors={state.fields} eventId={saveAction ? undefined : eventId} />
          <ConfiguredFields fields={role.fields} values={p.respuestas} onChange={(value) => answers(i, value)} prefix={`integrantes.${i}.respuestas`} errors={state.fields} />
          {members.filter((m) => m.funcion === role.id).length > role.min && <button className="button button-secondary" type="button" onClick={() => setMembers((current) => current.filter((m) => m.formKey !== p.formKey))}>Quitar {role.label.toLowerCase()}</button>}
        </fieldset>)}
        {members.filter((m) => m.funcion === role.id).length < role.max && <button className="button button-secondary" type="button" onClick={() => setMembers((current) => [...current, { ...emptyPerson(), funcion: role.id, formKey: crypto.randomUUID() }])}>Agregar {role.label.toLowerCase()}</button>}
      </section>)}
      {presencial && isFull && <label className="confirmation-check"><input name="confirmarExcepcion" type="checkbox" required />Confirmo el alta excepcional por encima del cupo.</label>}
      <p className="privacy-note">Usaremos estos datos para gestionar la inscripción, acreditación y los recursos del evento. {mode.definition.certificate === "grupo" && "Los integrantes compartirán un certificado que se habilitará cuando se acredite la persona responsable."}</p>
      <button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : saveAction ? "Guardar integrantes y respuestas" : presencial ? "Agregar y acreditar" : publicIdentity?.editToken ? "Guardar cambios en mi inscripción" : "Confirmar inscripción"}</button>
      </>}
    </>}
  </form>;
}
