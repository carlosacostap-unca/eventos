"use client";

import { useActionState } from "react";

import {
  lookupCertificatesAction,
  type CertificateLookupState,
} from "@/app/actions/public-certificates";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";

const initialState: CertificateLookupState = {};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export function CertificateLookupForm() {
  const [state, action] = useActionState(lookupCertificatesAction, initialState);

  return (
    <div className="certificate-lookup-layout">
      <form action={action} className="panel form-stack certificate-lookup-form">
        <div>
          <p className="eyebrow">Consulta personal</p>
          <h2>Ingresá tus datos</h2>
          <p className="muted">
            Usá el mismo número de documento y email que informaste al inscribirte.
          </p>
        </div>
        <FormMessage message={state.message} success={state.ok} />
        <label className="field">
          <span>Número de documento</span>
          <input name="documento" inputMode="numeric" autoComplete="off" required />
          <FieldError errors={state.fields?.documento} />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
          <FieldError errors={state.fields?.email} />
        </label>
        <SubmitButton pendingLabel="Buscando certificados…">
          Buscar certificados
        </SubmitButton>
        <p className="privacy-note">
          La consulta es temporal y solo habilita los certificados asociados a estos datos.
        </p>
      </form>

      {state.ok && state.certificates ? (
        <section className="panel certificate-results" aria-live="polite">
          <div>
            <p className="eyebrow">Disponibles</p>
            <h2>Tus certificados</h2>
          </div>
          <div className="certificate-result-list">
            {state.certificates.map((certificate) => (
              <article className="certificate-result" key={certificate.id}>
                <div>
                  <h3>{certificate.eventTitle}</h3>
                  <p>{formatEventDate(certificate.eventDate)}</p>
                </div>
                <a
                  className="button button-primary"
                  href={`/api/certificados/${certificate.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Descargar PDF
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
