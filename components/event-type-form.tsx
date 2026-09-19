"use client";

import { useActionState } from "react";

import {
  createEventTypeAction,
  updateEventTypeAction,
} from "@/app/actions/event-types";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import type { EventTypeRecord } from "@/lib/domain/models";

export function EventTypeForm({ type }: { type?: EventTypeRecord }) {
  const action = type ? updateEventTypeAction.bind(null, type.id) : createEventTypeAction;
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="panel form-stack">
      <FormMessage message={state.message} />
      <label className="field">
        <span>Nombre del tipo</span>
        <input
          name="nombre"
          defaultValue={type?.nombre}
          placeholder="Jornada, curso, conferencia…"
          maxLength={80}
          required
        />
        <FieldError errors={state.fields?.nombre} />
      </label>
      <label className="field">
        <span>Descripción (opcional)</span>
        <textarea
          name="descripcion"
          rows={3}
          maxLength={500}
          defaultValue={type?.descripcion}
        />
        <FieldError errors={state.fields?.descripcion} />
      </label>
      <label className="switch-row">
        <input name="activo" type="checkbox" defaultChecked={type?.activo ?? true} />
        <span>
          <strong>Disponible para nuevos eventos</strong>
          <small>Al desactivarlo, los eventos existentes conservarán este tipo.</small>
        </span>
      </label>
      <div className="actions-row">
        <SubmitButton>{type ? "Guardar tipo" : "Crear tipo"}</SubmitButton>
      </div>
    </form>
  );
}
