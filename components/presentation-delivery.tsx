"use client";
import { useActionState, useState } from "react";
import { lookupPresentationsAction, uploadPresentationAction, type PresentationLookup } from "@/app/actions/presentations";
import type { PresentationWork } from "@/lib/services/presentations";
import type { ActionState } from "@/app/actions/state";
import type { PresentationInfo } from "@/lib/domain/presentations";
import { PresentationFileInput } from "./presentation-file-input";
import { FormMessage } from "./form-feedback";
import { formatDeadline } from "@/lib/domain/modality-deadlines";

export function PresentationDelivery({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(lookupPresentationsAction.bind(null, eventId), {} as PresentationLookup);
  const [document, setDocument] = useState("");
  const [search, setSearch] = useState(0);
  return <div className="form-stack">
    <form action={action} className="panel form-stack" autoComplete="off"><label className="field"><span>DNI del alumno expositor</span><input name="documento" inputMode="numeric" required minLength={5} maxLength={32} value={document} disabled={pending} onChange={(event) => { setDocument(event.target.value); setSearch((value) => value + 1); }} /></label>
      <button className="button button-primary" disabled={pending} onClick={() => setSearch((value) => value + 1)}>{pending ? "Buscando trabajos…" : "Buscar mis trabajos"}</button>
      <FormMessage message={state.message} />
    </form>
    {!pending && state.ok && state.document === document.trim() && state.works?.map((work) => <DeliveryForm key={work.id + "-" + search} eventId={eventId} work={work} document={state.document!} token={state.token!} />)}
  </div>;
}
function DeliveryForm({ eventId, work, document, token }: { eventId: string; work: PresentationWork; document: string; token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [current, setCurrent] = useState(work.presentation);
  const [state, action, pending] = useActionState(async (previous: ActionState & { presentation?: PresentationInfo }, data: FormData) => {
    if (error || !file) return { message: error || "Seleccioná un archivo para entregar." };
    data.set("presentacion", file);
    const result = await uploadPresentationAction(eventId, work.id, previous, data);
    if (result.ok) { setFile(null); setCurrent(result.presentation); }
    return result;
  }, {} as ActionState & { presentation?: PresentationInfo });
  return <form action={action} className="panel form-stack" aria-label={"Entregar presentación de " + work.title}>
    <h2>{work.title}</h2>
    {work.closesAt && <p className={work.closed ? "notice notice-warning" : "muted"}>{work.closed ? "El plazo de entrega y reemplazo terminó el " : "Podés entregar o reemplazar archivos hasta el "}{formatDeadline(work.closesAt)}, hora de Argentina.</p>}
    <fieldset className="form-stack quick-fields" disabled={pending || work.closed}>
      <input name="documento" type="hidden" value={document} /><input name="token" type="hidden" value={token} /><input name="revision" type="hidden" value={current?.revision ?? work.revision} />
      <PresentationFileInput file={file} current={current} error={error} onChange={(next, problem) => { setFile(next); setError(problem ?? undefined); }} />
      <button className="button button-primary" disabled={pending || !file || !!error}>{pending ? "Subiendo presentación…" : current ? "Reemplazar presentación final" : "Entregar presentación final"}</button>
    </fieldset><FormMessage message={state.ok && file ? undefined : state.message} success={state.ok} />
  </form>;
}
