"use client";

import { useActionState, useState } from "react";

import { loginAction } from "@/app/actions/auth";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialActionState);
  const [showPassword, setShowPassword] = useState(false);
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
        <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
        <FieldError errors={state.fields?.password} />
      </label>
      <button className="text-button password-toggle" type="button" aria-controls="login-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</button>
      <SubmitButton pendingLabel="Ingresando…">Ingresar al panel</SubmitButton>
    </form>
  );
}
