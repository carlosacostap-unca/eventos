"use client";

import { useActionState } from "react";
import { verifyCertificateAction, type CertificateVerificationState } from "@/app/actions/verify-certificate";
import { SubmitButton } from "./submit-button";
import { FormMessage } from "./form-feedback";

function date(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
}

const initialState: CertificateVerificationState = {};

export function CertificateVerificationForm() {
  const [state, action, pending] = useActionState(verifyCertificateAction, initialState);
  const result = pending ? undefined : state.result;
  return <div className="form-stack">
    <div className="certificate-lookup-layout">
      <form action={action} className="panel form-stack certificate-lookup-form">
        <div><p className="eyebrow">Consulta pública</p><h2>Ingresá el código del certificado</h2><p className="muted">Copiá el código de validación completo que figura al pie del certificado.</p></div>
        <label className="field"><span>Código del certificado</span><input name="codigo" required maxLength={80} autoComplete="off" spellCheck={false} placeholder="CERT-… o código anterior" /></label>
        <SubmitButton pendingLabel="Consultando registro…">Validar certificado</SubmitButton>
        {!pending && <FormMessage message={state.message} />}
      </form>
      <aside className="panel certificate-guide"><h2>Comprobá los datos</h2><p>La consulta muestra los certificados emitidos por la Facultad de Tecnología y Ciencias Aplicadas de la Universidad Nacional de Catamarca.</p><p className="muted">Acepta códigos actuales y anteriores. Compará los nombres, números de documento, el evento y el trabajo con el certificado que recibiste.</p></aside>
    </div>
    <div aria-live="polite" aria-busy={pending}>
      {result && <section className="form-stack">
        <p className="verification-code">Código consultado: <strong>{state.code}</strong></p>
        {result.certificates.length === 0
          ? <div className="panel"><h2>No se pudo validar el certificado</h2><p>Revisá el código. Si está correcto, consultá con la Facultad: el certificado puede no estar emitido o necesitar una actualización.</p></div>
          : <>
            {result.legacy && result.certificates.length > 1 && <p className="panel">Este código anterior corresponde a varios certificados de la misma inscripción. Compará el trabajo y los participantes para identificar el que recibiste.</p>}
            {result.certificates.map((certificate) => <article className="panel form-stack" key={certificate.code}>
              <div><p className="eyebrow">Certificado registrado</p><h2>{certificate.eventTitle}</h2></div>
              <dl className="verification-details">
                <div><dt>Fecha del evento</dt><dd>{date(certificate.eventDate)}</dd></div>
                <div><dt>Fecha de emisión</dt><dd>{date(certificate.issuedAt)}</dd></div>
                <div><dt>Participación</dt><dd>{certificate.modality}</dd></div>
                {certificate.workTitle && <div><dt>Trabajo presentado</dt><dd>{certificate.workTitle}</dd></div>}
              </dl>
              <ul>{certificate.participants.map((participant, index) => <li key={index}><strong>{participant.name}</strong> · DNI {participant.document} · {participant.role}</li>)}</ul>
            </article>)}
            {result.unavailableCount > 0 && <p className="muted">Otros certificados asociados a este código necesitan una actualización. Consultá con la Facultad.</p>}
          </>}
      </section>}
    </div>
  </div>;
}
