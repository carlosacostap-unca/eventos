"use client";

import { useActionState } from "react";

import { linkExistingSpeakerAction } from "@/app/actions/speakers";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import type { SpeakerRecord } from "@/lib/domain/models";

export function SpeakerReuseForm({
  eventId,
  speakers,
}: {
  eventId: string;
  speakers: SpeakerRecord[];
}) {
  const [state, action] = useActionState(
    linkExistingSpeakerAction.bind(null, eventId),
    initialActionState,
  );

  return (
    <form action={action} className="panel form-stack">
      <FormMessage message={state.message} />
      <label className="field">
        <span>Disertante existente</span>
        <select name="disertante" defaultValue="" required>
          <option value="" disabled>Seleccioná un disertante</option>
          {speakers.map((speaker) => (
            <option value={speaker.id} key={speaker.id}>
              {speaker.titulo} {speaker.nombre} — {speaker.universidades.replace(/\s+/g, " ")}
            </option>
          ))}
        </select>
        <FieldError errors={state.fields?.disertante} />
      </label>
      <div className="actions-row">
        <SubmitButton>Agregar al evento</SubmitButton>
      </div>
    </form>
  );
}
