"use client";

import { useActionState, useState, type Dispatch, type SetStateAction } from "react";
import { updateLinkedRegistrationAction } from "@/app/actions/modalities";
import { initialActionState } from "@/app/actions/state";
import type { PersonSubmission } from "@/lib/domain/modalities";
import type { EditableRegistration, ExhibitionParticipation, RegistrationPrefillResult } from "@/lib/domain/registration-prefill";
import { FormMessage } from "./form-feedback";
import { PersonFields } from "./registration-person-fields";

export function ExhibitionMemberships({ participations }: { participations: ExhibitionParticipation[] }) {
  return <section className="form-stack" aria-label="Tus exposiciones">
    <h3>{participations.length === 1 ? "Tu exposición" : "Tus exposiciones"}</h3>
    {participations.map((participation, index) => <div className="member-section" key={index}>
      <p><strong>{participation.role}</strong></p>
      <p>{participation.title}</p>
      <p className="muted">Alumno expositor responsable: {participation.principalName}</p>
    </div>)}
  </section>;
}

export function LinkedRegistrationForm({ eventId, registration, person, setPerson, ready, message, onLookup, onReadyChange, onAddExhibition }: {
  eventId: string;
  registration: EditableRegistration;
  person: PersonSubmission;
  setPerson: Dispatch<SetStateAction<PersonSubmission>>;
  ready: boolean;
  message: string;
  onLookup: (result: RegistrationPrefillResult) => void;
  onReadyChange: (ready: boolean) => void;
  onAddExhibition?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [kept, setKept] = useState(false);
  const [state, action, pending] = useActionState(updateLinkedRegistrationAction.bind(null, eventId), initialActionState);
  return <form action={action} className="form-stack" onSubmit={(event) => {
    if (!editing || !ready) event.preventDefault();
  }}>
    <FormMessage message={state.message} success={state.ok} />
    <input type="hidden" name="payload" value={JSON.stringify(person)} />
    <input type="hidden" name="editToken" value={ready ? registration.token : ""} />
    {!state.ok && <PersonFields person={person} setPerson={setPerson} eventId={eventId} prefix="principal" errors={state.fields} initialReady={ready} initialMessage={message} identityReadOnly={!editing} includeRegistration onLookup={onLookup} onReadyChange={onReadyChange} />}
    {ready && <>
      <ExhibitionMemberships participations={registration.participations ?? []} />
      {onAddExhibition && <button type="button" className="button button-secondary" onClick={(event) => { event.preventDefault(); onAddExhibition(); }}>Inscribir otro trabajo como expositor</button>}
      {!state.ok && <>
        {kept && <p role="status">Tu inscripción sigue confirmada en la misma exposición. No necesitás volver a inscribirte.</p>}
        {editing ? <button key="save" type="submit" className="button button-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios en mis datos"}</button> : <button key="edit" type="button" className="button button-primary" onClick={(event) => { event.preventDefault(); setEditing(true); setKept(false); }}>Modificar mis datos</button>}
        {!editing && !kept && <button type="button" className="button button-secondary" onClick={() => setKept(true)}>Dejar mi inscripción como está</button>}
      </>}
    </>}
  </form>;
}
