"use client";
import { useActionState } from "react";
import { createStaffAction, saveAssignmentAction } from "@/app/actions/staff";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "./form-feedback";
import { SubmitButton } from "./submit-button";

export function StaffForm() {
  const [state, action] = useActionState(createStaffAction, initialActionState);
  return <form action={action} className="panel form-stack">
    <h2>Crear cuenta operativa</h2>
    <FormMessage message={state.message} success={state.ok} />
    <label className="field"><span>Nombre</span><input name="nombre" required maxLength={120} /><FieldError errors={state.fields?.nombre} /></label>
    <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="off" /><FieldError errors={state.fields?.email} /></label>
    <label className="field"><span>Contraseña inicial</span><input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /><small>Al menos 12 caracteres. Compartila con la persona por un canal privado.</small><FieldError errors={state.fields?.password} /></label>
    <SubmitButton pendingLabel="Creando…">Crear cuenta</SubmitButton>
  </form>;
}

export function AssignmentForm({ eventId, users, current }: { eventId: string; users: { id: string; nombre: string; email: string }[]; current?: { usuario: string; rol: string } }) {
  const [state, action] = useActionState(saveAssignmentAction.bind(null, eventId), initialActionState);
  return <form action={action} className="form-stack">
    <FormMessage message={state.message} success={state.ok} />
    <label className="field"><span>Persona</span><select name="usuario" required defaultValue={current?.usuario ?? ""}><option value="" disabled>Seleccionar cuenta</option>{users.map(u => <option key={u.id} value={u.id}>{u.nombre} · {u.email}</option>)}</select></label>
    <label className="field"><span>Rol en este evento</span><select name="rol" defaultValue={current?.rol ?? "administrador_evento"}><option value="administrador_evento">Administrador de evento</option><option value="acreditador">Acreditador</option></select></label>
    <SubmitButton pendingLabel="Guardando…">Guardar asignación</SubmitButton>
  </form>;
}
