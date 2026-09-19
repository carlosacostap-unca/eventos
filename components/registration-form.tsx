"use client";

import { useActionState, useEffect, useRef } from "react";

import { registerAction } from "@/app/actions/registrations";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";

export function RegistrationForm({ slug }: { slug: string }) {
  const [state, action] = useActionState(
    registerAction.bind(null, slug),
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="panel form-stack">
      <div>
        <p className="eyebrow">Formulario de inscripción</p>
        <h2>Reservá tu lugar</h2>
      </div>
      <FormMessage message={state.message} success={state.ok} />
      {!state.ok && (
        <>
          <div className="form-grid">
            <label className="field">
              <span>Nombres</span>
              <input name="nombres" autoComplete="given-name" required />
              <FieldError errors={state.fields?.nombres} />
            </label>
            <label className="field">
              <span>Apellidos</span>
              <input name="apellidos" autoComplete="family-name" required />
              <FieldError errors={state.fields?.apellidos} />
            </label>
            <label className="field">
              <span>Número de documento</span>
              <input name="documento" inputMode="numeric" required />
              <FieldError errors={state.fields?.documento} />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" required />
              <FieldError errors={state.fields?.email} />
            </label>
          </div>
          <p className="privacy-note">
            Usaremos estos datos exclusivamente para gestionar tu inscripción,
            asistencia y certificado.
          </p>
          <SubmitButton pendingLabel="Confirmando inscripción…">
            Confirmar inscripción
          </SubmitButton>
        </>
      )}
    </form>
  );
}
