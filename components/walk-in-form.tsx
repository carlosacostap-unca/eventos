"use client";

import { useActionState, useEffect, useRef } from "react";

import { createWalkInAction } from "@/app/actions/registrations";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";

export function WalkInForm({ eventId, isFull }: { eventId: string; isFull: boolean }) {
  const [state, action] = useActionState(
    createWalkInAction.bind(null, eventId),
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="panel form-stack">
      <div>
        <p className="eyebrow">Alta presencial</p>
        <h2>Agregar y acreditar</h2>
      </div>
      {isFull && (
        <div className="notice notice-warning">
          <p>El cupo público está completo. Esta alta presencial lo superará.</p>
          <label className="confirmation-check">
            <input name="confirmarExcepcion" type="checkbox" required />
            <span>Confirmo el alta excepcional por encima del cupo.</span>
          </label>
        </div>
      )}
      <FormMessage message={state.message} success={state.ok} />
      <div className="form-grid">
        <label className="field">
          <span>Nombres</span>
          <input name="nombres" required />
          <FieldError errors={state.fields?.nombres} />
        </label>
        <label className="field">
          <span>Apellidos</span>
          <input name="apellidos" required />
          <FieldError errors={state.fields?.apellidos} />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required />
          <FieldError errors={state.fields?.email} />
        </label>
        <label className="field">
          <span>Documento</span>
          <input name="documento" required />
          <FieldError errors={state.fields?.documento} />
        </label>
      </div>
      <SubmitButton pendingLabel="Acreditando…">Agregar y acreditar</SubmitButton>
    </form>
  );
}
