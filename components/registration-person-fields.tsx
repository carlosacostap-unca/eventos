"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { lookupRegistrationPersonAction } from "@/app/actions/registration-prefill";
import type { PersonSubmission } from "@/lib/domain/modalities";
import { normalizeDocument } from "@/lib/domain/models";
import { registrationDocumentSchema } from "@/lib/domain/registration-prefill";
import { FieldError } from "./form-feedback";

export function PersonFields({ person, setPerson, prefix = "", errors = {}, eventId, onReadyChange }: {
  person: PersonSubmission;
  setPerson: Dispatch<SetStateAction<PersonSubmission>>;
  prefix?: string;
  errors?: Record<string, string[] | undefined>;
  eventId?: string;
  onReadyChange?: (ready: boolean) => void;
}) {
  const [ready, setReady] = useState(!eventId || Boolean(person.nombres || person.apellidos || person.email));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef(0);
  const activeDocument = useRef<string | null>(null);
  const fieldName = (key: string) => prefix ? prefix + "." + key : key;
  useEffect(() => () => { request.current++; }, []);

  async function lookup() {
    if (!eventId || ready) return;
    const parsed = registrationDocumentSchema.safeParse(person.documento);
    if (!parsed.success) { setMessage("Ingresá un DNI o documento válido."); return; }
    const normalized = normalizeDocument(parsed.data);
    if (activeDocument.current === normalized) return;
    activeDocument.current = normalized;
    const currentRequest = ++request.current;
    setPending(true);
    setMessage("");
    try {
      const result = await lookupRegistrationPersonAction(eventId, parsed.data);
      if (request.current !== currentRequest) return;
      if (result.person) setPerson((current) => ({ ...current, ...result.person, documento: current.documento }));
      setMessage(result.message);
      setReady(true);
      onReadyChange?.(true);
    } catch {
      if (request.current !== currentRequest) return;
      setMessage("No pudimos consultar tus datos. Podés completarlos manualmente.");
      setReady(true);
      onReadyChange?.(true);
    } finally {
      if (request.current === currentRequest) { setPending(false); activeDocument.current = null; }
    }
  }

  function changeDocument(value: string) {
    if (!eventId) { setPerson({ ...person, documento: value }); return; }
    // Invalida consultas en vuelo para no asociar los datos de otro DNI.
    request.current++;
    activeDocument.current = null;
    setPending(false);
    setMessage("");
    setReady(false);
    onReadyChange?.(false);
    setPerson({ ...person, documento: value, nombres: "", apellidos: "", email: "" });
  }

  return <div className="form-stack">
    <div className="form-grid">
      <label className="field"><span>DNI / Documento *</span>
        <input name={fieldName("documento")} required minLength={5} maxLength={32} value={person.documento} data-identity-unresolved={!ready && eventId ? "true" : undefined}
          onChange={(event) => changeDocument(event.target.value)} onBlur={() => { if (person.documento.trim()) void lookup(); }}
          onKeyDown={(event) => { if (event.key === "Enter" && !ready && eventId) { event.preventDefault(); void lookup(); } }} />
        <FieldError errors={errors[fieldName("documento")]} />
      </label>
      {eventId && !ready && <div className="field"><span>Ingresá el DNI para recuperar tus datos.</span><button type="button" className="button button-secondary" onClick={() => void lookup()} disabled={pending}>{pending ? "Buscando…" : "Buscar datos"}</button></div>}
    </div>
    {message && <p className="muted" role="status" aria-live="polite">{message}</p>}
    {ready && <div className="form-grid">{([["apellidos", "Apellidos", "family-name"], ["nombres", "Nombres", "given-name"], ["email", "Email", "email"]] as const).map(([key, label, autoComplete]) => <label className="field" key={key}><span>{label} *</span><input name={fieldName(key)} required type={key === "email" ? "email" : "text"} autoComplete={autoComplete} maxLength={key === "email" ? 254 : 120} value={person[key]} onChange={(event) => setPerson({ ...person, [key]: event.target.value })} /><FieldError errors={errors[fieldName(key)]} /></label>)}</div>}
  </div>;
}
