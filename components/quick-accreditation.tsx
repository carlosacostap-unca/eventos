"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { lookupAccreditationAction, confirmAccreditationAction } from "@/app/actions/accreditation";
import { createWalkInAction } from "@/app/actions/registrations";
import { registerConfiguredAction } from "@/app/actions/modalities";
import { initialActionState, type ActionState } from "@/app/actions/state";
import { accreditationDocumentSchema, type AccreditationLookup, type AccreditationPerson } from "@/lib/domain/accreditation";
import type { PublicModality } from "@/lib/domain/modalities";
import type { RegistrationInput } from "@/lib/domain/models";
import { ConfiguredForm } from "./modal-registration-form";
import { FieldError, FormMessage } from "./form-feedback";

type Props = { eventId: string; eventTitle: string; modes: PublicModality[]; isFull: boolean; canManage: boolean };
type FlowProps = { eventId: string; onDone: () => void; onBusy: (busy: boolean) => void };

export function QuickAccreditation(props: Props) {
  const [handoff, setHandoff] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [lookup, setLookup] = useState<AccreditationLookup>();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastActivity = useRef(0);
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (lookup) {
      card.current?.querySelector<HTMLElement>("h2")?.focus();
      card.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [lookup]);
  function next() {
    setLookup(undefined);
    setDone(false);
    setCycle((value) => value + 1);
    lastActivity.current = Date.now();
  }
  useEffect(() => {
    if (!done) return;
    const timeout = setTimeout(() => { setLookup(undefined); setDone(false); setCycle((value) => value + 1); }, 8000);
    return () => clearTimeout(timeout);
  }, [done]);
  useEffect(() => {
    if (done || busy) return;
    lastActivity.current = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current >= 90000) {
        setLookup(undefined);
        setCycle((value) => value + 1);
        lastActivity.current = Date.now();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [done, busy]);
  function complete() { setLookup(undefined); setDone(true); }
  function activityBusy(value: boolean) { lastActivity.current = Date.now(); setBusy(value); }
  const shared: FlowProps = { eventId: props.eventId, onDone: complete, onBusy: activityBusy };
  return <main className="admin-main accreditation-kiosk" data-handoff={handoff} onPointerDownCapture={() => { lastActivity.current = Date.now(); }} onKeyDownCapture={() => { lastActivity.current = Date.now(); }} onInputCapture={() => { lastActivity.current = Date.now(); }}>
    <div className="quick-toolbar">
      {!handoff && <Link className="back-link" href={props.canManage ? `/admin/eventos/${props.eventId}` : "/admin"}>← {props.canManage ? "Volver al evento" : "Mis eventos"}</Link>}
      <button type="button" className="button button-secondary" disabled={busy} aria-pressed={handoff} onClick={() => { next(); setHandoff(!handoff); }}>{handoff ? "Volver al modo equipo" : "Pasar la tablet · Autoservicio"}</button>
    </div>
    <header className="quick-heading">
      <p className="eyebrow">{handoff ? "Te damos la bienvenida" : "Acreditación en puerta"}</p>
      <h1>{handoff ? "Confirmá tu llegada" : "Acreditar por DNI"}</h1>
      <p className="quick-event-title">{props.eventTitle}</p>
    </header>
    <ol className="quick-steps" aria-label="Pasos de acreditación">
      {["Ingresá tu DNI", "Revisá tus datos", "Confirmá tu llegada"].map((label, index) => <li key={label} aria-current={(done ? 2 : lookup ? 1 : 0) === index ? "step" : undefined}><span aria-hidden="true">{index + 1}</span>{label}</li>)}
    </ol>
    <section ref={card} className="panel quick-card" aria-label="Acreditación por DNI" key={cycle} onSubmitCapture={() => { if (lookup) activityBusy(true); }}>
      {done ? <div className="quick-success form-stack" role="status">
        <span className="quick-success-mark" aria-hidden="true">✓</span>
        <h2>¡Acreditación confirmada!</h2><p>Tu llegada quedó registrada. Ya podés ingresar al evento.</p>
        <button type="button" autoFocus className="button button-primary" onClick={next}>Acreditar a otra persona</button>
        <small className="muted">La pantalla vuelve al inicio en 8 segundos.</small>
      </div> : !lookup ? <DocumentLookup eventId={props.eventId} onBusy={activityBusy} onFound={(result) => { lastActivity.current = Date.now(); setLookup(result); }} /> : <div className="form-stack">
        <div className="quick-result-heading"><span className="eyebrow">DNI {lookup.document}</span><button type="button" className="button button-secondary" disabled={busy} onClick={next}>Cambiar DNI</button></div>
        {lookup.person ? <ReviewPerson {...shared} person={lookup.person} /> : <NewPerson {...props} {...shared} busy={busy} document={lookup.document!} />}
        <button className="button button-secondary" type="button" disabled={busy} onClick={next}>Cancelar y volver al inicio</button>
        <small className="muted">Los datos se limpian después de 90 segundos sin actividad.</small>
      </div>}
    </section>
    {!handoff && <footer className="quick-footer"><p>Podés operar desde tu celular o pasar la tablet para que cada persona revise sus datos.</p><Link className="button button-secondary" href={`/admin/eventos/${props.eventId}/acreditacion/listado`}>Abrir listado de participantes</Link></footer>}
  </main>;
}

function DocumentLookup({ eventId, onFound, onBusy }: { eventId: string; onFound: (result: AccreditationLookup) => void; onBusy: (busy: boolean) => void }) {
  const [document, setDocument] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const active = useRef(false);
  return <form className="form-stack quick-lookup" autoComplete="off" onSubmit={async (event) => {
    event.preventDefault();
    if (active.current) return;
    const parsed = accreditationDocumentSchema.safeParse(document);
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; }
    active.current = true; setPending(true); onBusy(true); setMessage("");
    try {
      const result = await lookupAccreditationAction(eventId, parsed.data);
      if (result.document) onFound(result);
      else setMessage(result.message ?? "No pudimos consultar el DNI.");
    } catch { setMessage("No pudimos conectar. Revisá la conexión y volvé a buscar."); }
    finally { active.current = false; setPending(false); onBusy(false); }
  }}>
    <div><h2>Empezá con tu DNI</h2><p className="muted">Si ya te inscribiste, recuperamos tus datos. Si todavía no lo hiciste, podés inscribirte acá.</p></div>
    <label className="field"><span>DNI</span><input className="quick-document" name="documento" inputMode="numeric" enterKeyHint="search" autoComplete="off" autoFocus required maxLength={32} value={document} disabled={pending} aria-describedby="dni-help" aria-invalid={!!message} onChange={(event) => { setDocument(event.target.value); setMessage(""); }} placeholder="Ej.: 30123456" /></label>
    <small id="dni-help" className="muted">Ingresá el número completo. Puede ser con o sin puntos.</small>
    <FormMessage message={message} />
    <button type="submit" className="button button-primary" disabled={pending} aria-busy={pending}>{pending ? "Buscando DNI…" : "Buscar mi DNI →"}</button>
  </form>;
}

function ReviewPerson({ eventId, person, onDone, onBusy }: FlowProps & { person: AccreditationPerson }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<RegistrationInput>({ nombres: person.nombres, apellidos: person.apellidos, documento: person.documento, email: person.email });
  const [state, action, pending] = useActionState(async (previous: ActionState, data: FormData) => {
    onBusy(true);
    try {
      const result = await confirmAccreditationAction(eventId, person.id, previous, data);
      if (result.ok) onDone();
      return result;
    } catch { return { message: "No pudimos conectar. Tus datos siguen acá; intentá confirmar nuevamente." }; }
    finally { onBusy(false); }
  }, initialActionState);
  return <form action={action} className="form-stack" autoComplete="off">
    <div><h2 tabIndex={-1}>{person.acreditado ? "Tu llegada ya está registrada" : "¿Están bien tus datos?"}</h2><p className="muted">{person.acreditado ? "Podés revisar y corregir tus datos. No se duplicará la acreditación." : "Revisá tus datos y confirmá para quedar acreditado."}</p></div>
    {person.acreditado && <p className="notice notice-success">✓ Ya acreditado{person.acreditado_en ? ` · ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(person.acreditado_en))}` : ""}</p>}
    {editing ? <fieldset className="quick-fields form-grid" disabled={pending}>
      {([ ["nombres", "Nombres"], ["apellidos", "Apellidos"], ["documento", "DNI / Documento"], ["email", "Email"] ] as const).map(([key, label]) => <label className="field" key={key}><span>{label}</span><input name={key} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} type={key === "email" ? "email" : "text"} inputMode={key === "documento" ? "numeric" : undefined} required maxLength={key === "email" ? 254 : key === "documento" ? 32 : 120} /><FieldError errors={state.fields?.[key]} /></label>)}
    </fieldset> : <div>
      <dl className="quick-person-summary"><div><dt>Nombre y apellido</dt><dd>{values.nombres} {values.apellidos}</dd></div><div><dt>DNI / Documento</dt><dd>{values.documento}</dd></div><div><dt>Email</dt><dd>{values.email}</dd></div></dl>
      {(["nombres", "apellidos", "documento", "email"] as const).map((key) => <div key={key}><input type="hidden" name={key} value={values[key]} /><FieldError errors={state.fields?.[key]} /></div>)}
    </div>}
    <FormMessage message={state.message} />
    {!editing && <button className="button button-secondary" type="button" disabled={pending} onClick={() => setEditing(true)}>Corregir mis datos</button>}
    <button type="submit" className="button button-primary" disabled={pending} aria-busy={pending}>{pending ? "Confirmando…" : person.acreditado ? "Aceptar y continuar" : editing ? "Guardar y confirmar acreditación" : "Confirmar acreditación ✓"}</button>
  </form>;
}

function NewPerson({ eventId, document, modes, isFull, canManage, onDone, onBusy, busy }: Props & FlowProps & { document: string; busy: boolean }) {
  const [selected, setSelected] = useState(() => modes.find((mode) => mode.definition.roles.length === 0)?.id ?? modes[0]?.id ?? "");
  const [operation] = useState(() => crypto.randomUUID());
  const mode = modes.find((item) => item.id === selected);
  if (isFull && !canManage) return <div className="notice notice-warning" role="status"><h2>No encontramos una inscripción</h2><p>El cupo está completo. Consultá con la organización para un alta presencial. Quienes ya están inscriptos pueden acreditarse.</p></div>;
  if (!mode) return <div className="notice notice-warning"><h2>No encontramos una inscripción</h2><p>La organización debe habilitar una modalidad para inscribirte en el lugar.</p></div>;
  async function save(previous: ActionState, data: FormData): Promise<ActionState> {
    onBusy(true);
    try {
      const result = mode!.id === "legacy" ? await createWalkInAction(eventId, previous, data) : await registerConfiguredAction(eventId, true, previous, data);
      if (result.ok) onDone();
      return result;
    } catch { return { message: "No pudimos conectar. Revisá la conexión e intentá nuevamente." }; }
    finally { onBusy(false); }
  }
  return <div className="form-stack"><div><h2 tabIndex={-1}>Inscribite en el lugar</h2><p className="muted">No hay una inscripción para este DNI en el evento. Completá tus datos: al confirmar, también quedás acreditado.</p></div>
    {modes.length > 1 && <label className="field"><span>Modalidad de participación</span><select disabled={busy} value={selected} onChange={(event) => setSelected(event.target.value)}>{modes.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>}
    {mode.id === "legacy" ? <LegacyNewPerson document={document} isFull={isFull} save={save} /> : <ConfiguredForm key={selected} eventId={eventId} mode={mode} operation={operation + "-" + selected} presencial isFull={isFull} saveAction={save} submitLabel="Inscribirme y confirmar acreditación" initial={{ principal: { documento: document, nombres: "", apellidos: "", email: "", respuestas: {} }, integrantes: mode.definition.roles.flatMap((role) => Array.from({ length: role.min }, () => ({ funcion: role.id, documento: "", nombres: "", apellidos: "", email: "", respuestas: {} }))) }} />}
  </div>;
}

function LegacyNewPerson({ document, isFull, save }: { document: string; isFull: boolean; save: (previous: ActionState, data: FormData) => Promise<ActionState> }) {
  const [state, action, pending] = useActionState(save, initialActionState);
  const [values, setValues] = useState({ documento: document, nombres: "", apellidos: "", email: "" });
  return <form action={action} className="form-stack" autoComplete="off">
    <fieldset className="quick-fields form-grid" disabled={pending}>{([ ["documento", "DNI"], ["nombres", "Nombres"], ["apellidos", "Apellidos"], ["email", "Email"] ] as const).map(([key, label]) => <label className="field" key={key}><span>{label}</span><input name={key} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} type={key === "email" ? "email" : "text"} inputMode={key === "documento" ? "numeric" : undefined} required maxLength={key === "email" ? 254 : key === "documento" ? 32 : 120} /><FieldError errors={state.fields?.[key]} /></label>)}</fieldset>
    {isFull && <label className="confirmation-check notice notice-warning"><input name="confirmarExcepcion" type="checkbox" required />Confirmo el alta excepcional por encima del cupo.</label>}
    <FormMessage message={state.message} /><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Confirmando…" : "Inscribirme y confirmar acreditación"}</button>
  </form>;
}
