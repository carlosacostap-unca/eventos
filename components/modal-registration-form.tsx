"use client";
import { useActionState, useState } from "react";
import { registerConfiguredAction } from "@/app/actions/modalities";
import type { Answers, PersonSubmission, PublicModality } from "@/lib/domain/modalities";
import { ConfiguredFields } from "./configured-fields";
import { FormMessage, FieldError } from "./form-feedback";
import { initialActionState } from "@/app/actions/state";
import type { ActionState } from "@/app/actions/state";

const emptyPerson = (): PersonSubmission => ({ nombres: "", apellidos: "", documento: "", email: "", respuestas: {} });
export function PersonFields({ person, setPerson, prefix, errors = {} }: { person: PersonSubmission; setPerson: (p: PersonSubmission) => void; prefix: string; errors?: Record<string, string[] | undefined> }) {
  return <div className="form-grid">{([ ["apellidos", "Apellidos"], ["nombres", "Nombres"], ["documento", "DNI / Documento"], ["email", "Email"] ] as const).map(([key, label]) => <label className="field" key={key}><span>{label} *</span><input name={prefix + "." + key} required type={key === "email" ? "email" : "text"} maxLength={key === "email" ? 254 : key === "documento" ? 32 : 120} value={person[key]} onChange={(e) => setPerson({ ...person, [key]: e.target.value })} /><FieldError errors={errors[prefix + "." + key]} /></label>)}</div>;
}
export function ModalRegistrationForm({ eventId, modes, operation, presencial = false, isFull = false }: { eventId: string; modes: PublicModality[]; operation: string; presencial?: boolean; isFull?: boolean }) {
  const [selected, setSelected] = useState(modes[0]?.id ?? "");
  const mode = modes.find((m) => m.id === selected);
  if (!mode) return <div className="panel">No hay modalidades de inscripción disponibles.</div>;
  return <div className="panel form-stack">
    <h2>{presencial ? "Agregar y acreditar" : "Reservá tu lugar"}</h2>
    {modes.length > 1 && <label className="field"><span>Modalidad de inscripción</span><select value={selected} onChange={(e) => setSelected(e.target.value)}>{modes.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>}
    <ConfiguredForm key={selected} eventId={eventId} mode={mode} operation={operation + "-" + selected} presencial={presencial} isFull={isFull} />
  </div>;
}
export function ConfiguredForm({ eventId, mode, operation, presencial, isFull, initial, saveAction }: { eventId: string; mode: PublicModality; operation: string; presencial: boolean; isFull: boolean; initial?: { principal: PersonSubmission; integrantes: Array<PersonSubmission & { funcion: string }> }; saveAction?: (state: ActionState, data: FormData) => Promise<ActionState> }) {
  const [principal, setPrincipal] = useState(() => initial?.principal ?? emptyPerson());
  const [members, setMembers] = useState(() => initial?.integrantes ?? mode.definition.roles.flatMap((role) => Array.from({ length: role.min }, () => ({ ...emptyPerson(), funcion: role.id }))));
  const [state, action, pending] = useActionState(saveAction ?? registerConfiguredAction.bind(null, eventId, presencial), initialActionState);
  const payload = { modalidad: mode.id, version: mode.version, operacion: operation, principal, integrantes: members };
  function answers(index: number, value: Answers) { setMembers(members.map((p, i) => i === index ? { ...p, respuestas: value } : p)); }
  return <form action={action} className="form-stack">
    <FormMessage message={state.message} success={state.ok} />
    <FieldError errors={state.fields?.formulario} />
    {!state.ok && <>
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <h3>{mode.definition.principal}</h3>
      <PersonFields person={principal} setPerson={setPrincipal} prefix="principal" errors={state.fields} />
      <ConfiguredFields fields={mode.definition.fields} values={principal.respuestas} onChange={(respuestas) => setPrincipal({ ...principal, respuestas })} prefix="principal.respuestas" errors={state.fields} />
      {mode.definition.roles.map((role) => <section className="form-stack member-section" key={role.id}>
        <h3>{role.label} {role.min > 0 ? "(obligatorio)" : "(opcional)"}</h3>
        <FieldError errors={state.fields?.["grupo." + role.id]} />
        {members.map((p, i) => p.funcion !== role.id ? null : <fieldset className="form-stack" key={i}><legend>{role.label} {role.max > 1 ? members.slice(0, i + 1).filter((m) => m.funcion === role.id).length : ""}</legend>
          <PersonFields person={p} setPerson={(person) => setMembers(members.map((m, n) => n === i ? { ...person, funcion: role.id } : m))} prefix={`integrantes.${i}`} errors={state.fields} />
          <ConfiguredFields fields={role.fields} values={p.respuestas} onChange={(value) => answers(i, value)} prefix={`integrantes.${i}.respuestas`} errors={state.fields} />
          {members.filter((m) => m.funcion === role.id).length > role.min && <button className="button button-secondary" type="button" onClick={() => setMembers(members.filter((_, n) => n !== i))}>Quitar {role.label.toLowerCase()}</button>}
        </fieldset>)}
        {members.filter((m) => m.funcion === role.id).length < role.max && <button className="button button-secondary" type="button" onClick={() => setMembers([...members, { ...emptyPerson(), funcion: role.id }])}>Agregar {role.label.toLowerCase()}</button>}
      </section>)}
      {presencial && isFull && <label className="confirmation-check"><input name="confirmarExcepcion" type="checkbox" required />Confirmo el alta excepcional por encima del cupo.</label>}
      <p className="privacy-note">Usaremos estos datos para gestionar la inscripción, acreditación y los recursos del evento. {mode.definition.certificate === "grupo" && "Los integrantes compartirán un certificado que se habilitará cuando se acredite la persona responsable."}</p>
      <button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : saveAction ? "Guardar integrantes y respuestas" : presencial ? "Agregar y acreditar" : "Confirmar inscripción"}</button>
    </>}
  </form>;
}
