"use client";

import { useActionState, useState } from "react";

import { updateRegistrationAction } from "@/app/actions/registrations";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import type { RegistrationInput, RegistrationRecord } from "@/lib/domain/models";
import type { ExtraField } from "@/lib/domain/modalities";
import { ConfiguredFields } from "./configured-fields";

export function RegistrationEditForm({ registration, fields = [] }: { registration: RegistrationRecord; fields?: ExtraField[] }) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <EditForm registration={registration} fields={fields} onClose={() => setEditing(false)} />
  ) : (
    <button type="button" className="text-button" onClick={() => setEditing(true)}>
      Editar datos
    </button>
  );
}

function EditForm({ registration, onClose, fields }: {
  fields: ExtraField[];
  registration: RegistrationRecord;
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState(registration.respuestas ?? {});
  const [values, setValues] = useState<RegistrationInput>({
    apellidos: registration.apellidos,
    nombres: registration.nombres,
    documento: registration.documento,
    email: registration.email,
  });
  const [state, action, pending] = useActionState(
    updateRegistrationAction.bind(null, registration.evento, registration.id),
    initialActionState,
  );
  return (
    <form action={action} className="form-stack registration-edit-form" aria-label="Editar datos del participante">
      <div className="form-grid">
        {([
          ["apellidos", "Apellidos", 120],
          ["nombres", "Nombres", 120],
          ["documento", "DNI / Documento", 32],
          ["email", "Email", 254],
        ] as const).map(([name, label, maxLength]) => (
          <label className="field" key={name}>
            <span>{label}</span>
            <input name={name} type={name === "email" ? "email" : "text"}
              value={values[name]} required maxLength={maxLength} disabled={pending}
              onChange={(event) => setValues({ ...values, [name]: event.target.value })} />
            <FieldError errors={state.fields?.[name]} />
          </label>
        ))}
      </div>
      {fields.length > 0 && <><input name="respuestas" type="hidden" value={JSON.stringify(answers)} /><ConfiguredFields fields={fields} values={answers} onChange={setAnswers} errors={state.fields} /></>}
      <FormMessage message={state.message} success={state.ok} />
      <div className="registration-edit-actions">
        <button className="button button-primary" type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button className="button button-secondary" type="button" onClick={onClose} disabled={pending}>
          {state.ok ? "Cerrar" : "Cancelar"}
        </button>
      </div>
    </form>
  );
}
