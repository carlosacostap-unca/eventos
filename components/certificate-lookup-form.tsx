"use client";

import { useActionState } from "react";

import {
  lookupCertificatesAction,
  type CertificateLookupState,
} from "@/app/actions/public-certificates";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";

const initialState: CertificateLookupState = {};

export function CertificateLookupForm() {
  const [state, action] = useActionState(lookupCertificatesAction, initialState);

  return (
    <div className="certificate-lookup-layout">
      <form action={action} className="panel form-stack certificate-lookup-form">
        <div>
          <p className="eyebrow">Consulta personal</p>
          <h2>Ingresá tu documento</h2>
          <p className="muted">
            Usá el mismo número de documento que informaste al inscribirte.
          </p>
        </div>
        <FormMessage message={state.message} success={state.ok} />
        <label className="field">
          <span>Número de documento</span>
          <input name="documento" inputMode="numeric" autoComplete="off" required />
          <FieldError errors={state.fields?.documento} />
        </label>
        <SubmitButton pendingLabel="Buscando recursos…">
          Buscar certificados y materiales
        </SubmitButton>
        <p className="privacy-note">
          La consulta es temporal y solo habilita recursos de los eventos donde acreditaste tu asistencia.
        </p>
      </form>

      <aside className="panel certificate-guide"><p className="eyebrow">Después de tu encuentro</p><h2>Recursos de tu participación</h2><p className="muted">Desde tu acreditación podés acceder a los materiales que comparta la organización. El certificado aparecerá cuando sea emitido.</p><ol><li>Ingresá el documento de tu inscripción.</li><li>Consultá tus eventos acreditados.</li><li>Descargá los materiales y certificados disponibles.</li></ol><p className="privacy-note">Si tu evento aún no aparece, consultá con la organización.</p></aside>
    </div>
  );
}
