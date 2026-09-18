"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/actions/auth";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialActionState);
  return (
    <form action={action} className="form-stack">
      <FormMessage message={state.message} />
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
        <FieldError errors={state.fields?.email} />
      </label>
      <label className="field">
        <span>Contraseña</span>
        <input name="password" type="password" autoComplete="current-password" required />
        <FieldError errors={state.fields?.password} />
      </label>
      <SubmitButton pendingLabel="Ingresando…">Ingresar al panel</SubmitButton>
    </form>
  );
}
