"use client";

import { useActionState } from "react";

import { createSpeakerAction, updateSpeakerAction } from "@/app/actions/speakers";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import type { SpeakerRecord } from "@/lib/domain/models";

export function SpeakerForm({
  eventId,
  speaker,
}: {
  eventId: string;
  speaker?: SpeakerRecord;
}) {
  const action = speaker
    ? updateSpeakerAction.bind(null, eventId, speaker.id)
    : createSpeakerAction.bind(null, eventId);
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="panel form-stack">
      <FormMessage message={state.message} />
      <div className="form-grid">
        <label className="field">
          <span>Título</span>
          <input name="titulo" defaultValue={speaker?.titulo} placeholder="Dra., Mg., Prof." maxLength={80} required />
          <FieldError errors={state.fields?.titulo} />
        </label>
        <label className="field">
          <span>Nombre y apellido</span>
          <input name="nombre" defaultValue={speaker?.nombre} maxLength={160} required />
          <FieldError errors={state.fields?.nombre} />
        </label>
        <label className="field field-wide">
          <span>Universidad(es) de origen</span>
          <textarea
            name="universidades"
            rows={3}
            maxLength={500}
            defaultValue={speaker?.universidades}
            placeholder="Escribí una universidad por línea"
            required
          />
          <FieldError errors={state.fields?.universidades} />
        </label>
        <label className="field field-wide">
          <span>{speaker ? "Reemplazar foto (opcional)" : "Foto"}</span>
          <input
            name="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={!speaker}
          />
          <small>JPG, PNG o WebP de hasta 5 MB.</small>
          <FieldError errors={state.fields?.foto} />
        </label>
      </div>
      <div className="actions-row">
        <SubmitButton>{speaker ? "Guardar disertante" : "Agregar disertante"}</SubmitButton>
      </div>
    </form>
  );
}
