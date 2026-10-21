"use client";
import { useActionState, useState } from "react";
import { saveModalityAction, copyModalitiesAction } from "@/app/actions/modalities";
import { initialActionState } from "@/app/actions/state";
import { attendeeDefinition, exhibitorDefinition, fieldTypes, type FormDefinition, type ExtraField, type Modality } from "@/lib/domain/modalities";
import { DEFAULT_CERTIFICATE_TEXTS, type CertificateTextSections } from "@/lib/domain/certificate-texts";
import { FormMessage } from "./form-feedback";
import { ConfiguredFields } from "./configured-fields";
import type { Answers } from "@/lib/domain/modalities";

const typeLabels = { text: "Texto corto", textarea: "Texto largo", number: "Número", date: "Fecha", email: "Email", tel: "Teléfono", select: "Selección única", multiselect: "Selección múltiple", checkbox: "Casilla de verificación" };
const textLabels: Record<keyof CertificateTextSections, string> = { institutionPrimary: "Encabezado principal", institutionSecondary: "Encabezado secundario", introduction: "Introducción", participant: "Participante", document: "Documento", participation: "Participación", event: "Evento", locationAndDate: "Lugar y fecha", signatureLeftName: "Firma izquierda: nombre", signatureLeftRole: "Firma izquierda: cargo", signatureLeftInstitution: "Firma izquierda: institución", signatureRightName: "Firma derecha: nombre", signatureRightRole: "Firma derecha: cargo", signatureRightInstitution: "Firma derecha: institución" };
function move<T>(items: T[], index: number, direction: number) { const next = [...items]; const target = index + direction; if (target >= 0 && target < items.length) [next[index], next[target]] = [next[target], next[index]]; return next; }
function FieldsEditor({ fields, setFields }: { fields: ExtraField[]; setFields: (fields: ExtraField[]) => void }) {
  const update = (i: number, patch: Partial<ExtraField>) => setFields(fields.map((f, n) => n === i ? { ...f, ...patch } : f));
  return <div className="form-stack">{fields.map((field, i) => <fieldset className="form-stack" key={field.id}><legend>{field.label || "Campo adicional"}</legend>
    <div className="form-grid">
      <label className="field"><span>Etiqueta</span><input value={field.label} maxLength={160} required onChange={(e) => update(i, { label: e.target.value })} /></label>
      <label className="field"><span>Tipo de dato</span><select value={field.type} onChange={(e) => update(i, { type: e.target.value as ExtraField["type"] })}>{fieldTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select></label>
      <label className="field"><span>Sección</span><input value={field.section} onChange={(e) => update(i, { section: e.target.value })} /></label>
      <label className="field"><span>Ayuda</span><input value={field.help} maxLength={500} onChange={(e) => update(i, { help: e.target.value })} /></label>
      {(field.type === "select" || field.type === "multiselect") && <label className="field field-wide"><span>Opciones, una por línea</span><textarea value={field.options.join("\n")} onChange={(e) => update(i, { options: e.target.value.split("\n") })} /></label>}
      {field.type === "number" && <><label className="field"><span>Mínimo</span><input type="number" value={field.min ?? ""} onChange={(e) => update(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })} /></label><label className="field"><span>Máximo</span><input type="number" value={field.max ?? ""} onChange={(e) => update(i, { max: e.target.value === "" ? undefined : Number(e.target.value) })} /></label></>}
    </div>
    <label><input type="checkbox" checked={field.required} onChange={(e) => update(i, { required: e.target.checked })} /> Obligatorio</label>
    <div className="actions-row"><button type="button" className="text-button" disabled={!i} onClick={() => setFields(move(fields, i, -1))}>Subir</button><button type="button" className="text-button" disabled={i === fields.length - 1} onClick={() => setFields(move(fields, i, 1))}>Bajar</button><button type="button" className="text-button" onClick={() => setFields(fields.filter((_, n) => n !== i))}>Quitar campo</button></div>
  </fieldset>)}<button type="button" className="button button-secondary" disabled={fields.length >= 30} onClick={() => setFields([...fields, { id: "campo_" + crypto.randomUUID().replaceAll("-", "").slice(0, 12), label: "Nuevo campo", type: "text", required: false, options: [], section: "", help: "" }])}>Agregar campo</button></div>;
}
export function ModalityEditor({ eventId, mode, definition }: { eventId: string; mode?: Modality; definition?: FormDefinition }) {
  const [form, setForm] = useState(definition ?? attendeeDefinition);
  const [name, setName] = useState(mode?.nombre ?? "Asistente");
  const [code, setCode] = useState(mode?.codigo ?? "asistente");
  const [order, setOrder] = useState(mode?.orden ?? 0);
  const [enabled, setEnabled] = useState(mode?.habilitada ?? true);
  const [delivery, setDelivery] = useState(mode?.entrega ?? true);
  const [clearTemplate, setClearTemplate] = useState(false);
  const [texts, setTexts] = useState<Partial<CertificateTextSections>>(mode?.textos_certificado ?? {});
  const [preview, setPreview] = useState<Answers>({});
  const [state, action, pending] = useActionState(saveModalityAction.bind(null, eventId), initialActionState);
  return <form action={action} className="form-stack modality-editor">
    <input name="payload" type="hidden" value={JSON.stringify({ id: mode?.id, nombre: name, codigo: code, orden: order, habilitada: enabled, entrega: delivery, definition: form, textos: texts, clearTemplate })} />
    <FormMessage message={state.message} success={state.ok} />
    {!mode && <label className="field"><span>Comenzar desde una configuración</span><select onChange={(e) => { const group = e.target.value === "expositor"; const custom = e.target.value === "personalizada"; setForm(group ? exhibitorDefinition : attendeeDefinition); setName(group ? "Expositor" : custom ? "Nueva modalidad" : "Asistente"); setCode(group ? "expositor" : custom ? "modalidad_" + crypto.randomUUID().slice(0, 8) : "asistente"); setTexts(group ? { introduction: "La Facultad certifica que los siguientes integrantes", participation: "han participado como expositores de la actividad de tipo {tipoEvento} de {horas} horas:" } : {}); }}><option value="asistente">Asistente</option><option value="expositor">Expositor con dirección</option><option value="personalizada">Modalidad personalizada</option></select></label>}
    <div className="form-grid"><label className="field"><span>Nombre de la modalidad</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="field"><span>Orden en el formulario</span><input type="number" min={0} max={1000} value={order} onChange={(e) => setOrder(Number(e.target.value))} /></label><label className="field"><span>Nombre de la persona principal</span><input value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} required /></label></div>
    <label><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Disponible para nuevas inscripciones</label>
    <p className="muted">Cada persona completa siempre apellidos, nombres, DNI y email. Podés agregar los datos particulares de esta modalidad.</p>
    <FieldsEditor fields={form.fields} setFields={(fields) => setForm({ ...form, fields })} />
    <h3>Integrantes vinculados</h3>
    {form.roles.map((role, i) => <fieldset key={role.id} className="form-stack"><legend>{role.label}</legend><div className="form-grid"><label className="field"><span>Función</span><input value={role.label} required onChange={(e) => setForm({ ...form, roles: form.roles.map((r, n) => n === i ? { ...r, label: e.target.value } : r) })} /></label>{(["min", "max"] as const).map((bound) => <label className="field" key={bound}><span>{bound === "min" ? "Mínimo obligatorio" : "Máximo permitido"}</span><input type="number" min={bound === "min" ? 0 : 1} max={10} value={role[bound]} onChange={(e) => setForm({ ...form, roles: form.roles.map((r, n) => n === i ? { ...r, [bound]: Number(e.target.value) } : r) })} /></label>)}</div><FieldsEditor fields={role.fields} setFields={(fields) => setForm({ ...form, roles: form.roles.map((r, n) => n === i ? { ...r, fields } : r) })} /><div className="actions-row"><button type="button" className="text-button" onClick={() => setForm({ ...form, roles: move(form.roles, i, -1) })}>Subir grupo</button><button type="button" className="text-button" onClick={() => setForm({ ...form, roles: move(form.roles, i, 1) })}>Bajar grupo</button><button type="button" className="text-button" onClick={() => setForm({ ...form, roles: form.roles.filter((_, n) => n !== i) })}>Quitar grupo</button></div></fieldset>)}
    <button type="button" className="button button-secondary" disabled={form.roles.length >= 5} onClick={() => setForm({ ...form, roles: [...form.roles, { id: "grupo_" + crypto.randomUUID().replaceAll("-", "").slice(0, 12), label: "Integrante", min: 0, max: 1, fields: [] }] })}>Agregar grupo de personas</button>
    <fieldset className="form-stack"><legend>Certificación</legend><label><input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} /> Entregar certificado</label><label className="field"><span>Regla de certificación</span><select value={form.certificate} onChange={(e) => setForm({ ...form, certificate: e.target.value as "individual" | "grupo" })}><option value="individual">Individual, requiere acreditación propia</option><option value="grupo">Un PDF compartido, requiere acreditación de la persona principal</option></select></label>
      <label className="field"><span>Plantilla PDF, PNG o JPG (opcional)</span><input type="file" name="plantilla" accept="application/pdf,image/png,image/jpeg" /></label>
      {mode?.plantilla_certificado && <label><input type="checkbox" checked={clearTemplate} onChange={(e) => setClearTemplate(e.target.checked)} /> Volver a la plantilla institucional</label>}
      <p className="muted">En el certificado compartido figuran todos los integrantes con su DNI y función. Podés usar <code>{"{evento}"}</code>, <code>{"{fecha}"}</code>, <code>{"{lugar}"}</code>, <code>{"{participante}"}</code>, <code>{"{responsable}"}</code> e <code>{"{integrantes}"}</code> en los textos.</p>
      <details><summary>Personalizar textos y firmas</summary><div className="form-grid">{(Object.keys(DEFAULT_CERTIFICATE_TEXTS) as Array<keyof CertificateTextSections>).filter((key) => form.certificate !== "grupo" || !["participant", "document"].includes(key)).map((key) => <label className="field" key={key}><span>{textLabels[key]}</span><textarea value={texts[key] ?? DEFAULT_CERTIFICATE_TEXTS[key]} onChange={(e) => setTexts({ ...texts, [key]: e.target.value })} /></label>)}</div></details>
      {mode && <a className="text-link" target="_blank" rel="noreferrer" href={`/api/admin/eventos/${eventId}/certificados/preview?modalidad=${mode.id}`}>Vista previa PDF de la configuración guardada</a>}
    </fieldset>
    <details><summary>Vista previa de campos adicionales</summary><ConfiguredFields fields={form.fields.map((field) => ({ ...field, required: false }))} values={preview} onChange={setPreview} /></details>
    <button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar y publicar configuración"}</button>
  </form>;
}
export function CopyModalitiesForm({ eventId, events }: { eventId: string; events: Array<{ id: string; titulo: string }> }) {
  const [state, action, pending] = useActionState(copyModalitiesAction.bind(null, eventId), initialActionState);
  return <form action={action} className="panel form-stack"><h2>Reutilizar otro evento</h2><FormMessage message={state.message} success={state.ok} /><label className="field"><span>Evento de origen</span><select name="origen" required><option value="">Elegí un evento</option>{events.filter((e) => e.id !== eventId).map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}</select></label><button className="button button-secondary" disabled={pending}>Copiar configuración</button></form>;
}
