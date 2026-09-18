"use client";

import { useActionState } from "react";

import {
  createEventAction,
  updateEventAction,
} from "@/app/actions/events";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { toArgentinaDateTimeLocal } from "@/lib/domain/dates";
import type { EventRecord } from "@/lib/domain/models";


export function EventForm({ event }: { event?: EventRecord }) {
  const action = event ? updateEventAction.bind(null, event.id) : createEventAction;
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="panel form-stack">
      <FormMessage message={state.message} />
      <div className="form-grid">
        <label className="field field-wide">
          <span>Título</span>
          <input name="titulo" defaultValue={event?.titulo} required />
          <FieldError errors={state.fields?.titulo} />
        </label>
        <label className="field">
          <span>Identificador público</span>
          <input
            name="slug"
            defaultValue={event?.slug}
            placeholder="jornada-de-extension"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
          />
          <FieldError errors={state.fields?.slug} />
        </label>
        <label className="field">
          <span>Lugar</span>
          <input name="lugar" defaultValue={event?.lugar} required />
          <FieldError errors={state.fields?.lugar} />
        </label>
        <label className="field">
          <span>Inicio</span>
          <input
            name="inicio"
            type="datetime-local"
            defaultValue={toArgentinaDateTimeLocal(event?.inicio)}
            required
          />
          <FieldError errors={state.fields?.inicio} />
        </label>
        <label className="field">
          <span>Finalización</span>
          <input
            name="fin"
            type="datetime-local"
            defaultValue={toArgentinaDateTimeLocal(event?.fin)}
            required
          />
          <FieldError errors={state.fields?.fin} />
        </label>
        <label className="field">
          <span>Cupo público</span>
          <input
            name="cupo"
            type="number"
            min="1"
            max="100000"
            defaultValue={event?.cupo ?? 100}
            required
          />
          <FieldError errors={state.fields?.cupo} />
        </label>
        <label className="field">
          <span>Estado</span>
          <select name="estado" defaultValue={event?.estado ?? "borrador"}>
            <option value="borrador">Borrador</option>
            <option value="publicado">Publicado</option>
            <option value="finalizado">Finalizado</option>
          </select>
          <FieldError errors={state.fields?.estado} />
        </label>
        <label className="field field-wide">
          <span>Descripción</span>
          <textarea
            name="descripcion"
            rows={7}
            defaultValue={event?.descripcion}
            required
          />
          <FieldError errors={state.fields?.descripcion} />
        </label>
      </div>
      <label className="switch-row">
        <input
          name="inscripcionHabilitada"
          type="checkbox"
          defaultChecked={event?.inscripcion_habilitada ?? false}
        />
        <span>
          <strong>Inscripción pública habilitada</strong>
          <small>También se cerrará automáticamente cuando se complete el cupo.</small>
        </span>
      </label>
      <div className="actions-row">
        <SubmitButton>{event ? "Guardar cambios" : "Crear evento"}</SubmitButton>
      </div>
    </form>
  );
}
