"use client";

import { useActionState, useState } from "react";

import { registerAction } from "@/app/actions/registrations";
import { initialActionState } from "@/app/actions/state";
import { FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { ModalRegistrationForm } from "./modal-registration-form";
import type { PersonSubmission, PublicModality } from "@/lib/domain/modalities";
import { PersonFields } from "./registration-person-fields";

export function RegistrationForm(props: { slug: string; offersCertificate: boolean; eventId?: string; modes?: PublicModality[]; operation?: string }) {
  if (props.modes && !props.modes.some((m) => m.id === "legacy")) return <ModalRegistrationForm eventId={props.eventId!} modes={props.modes} operation={props.operation!} />;
  return <LegacyRegistrationForm slug={props.slug} eventId={props.eventId} offersCertificate={props.offersCertificate} />;
}

function LegacyRegistrationForm({
  slug,
  offersCertificate,
  eventId,
}: {
  slug: string;
  offersCertificate: boolean;
  eventId?: string;
}) {
  const [state, action] = useActionState(
    registerAction.bind(null, slug),
    initialActionState,
  );
  const [person, setPerson] = useState<PersonSubmission>({ nombres: "", apellidos: "", email: "", documento: "", respuestas: {} });
  const [ready, setReady] = useState(!eventId);
  const [editToken, setEditToken] = useState("");

  return (
    <form action={action} className="panel form-stack">
      <div>
        <h2>Inscribite o actualizá tu inscripción</h2>
        <p className="muted">Ingresá tu DNI. Recuperaremos tus datos y, si ya estás inscripto en este evento, podrás actualizar tu inscripción.</p>
      </div>
      <FormMessage message={state.message} success={state.ok} />
      {!state.ok && (
        <>
          <input type="hidden" name="editToken" value={editToken} />
          <PersonFields person={person} setPerson={setPerson} errors={state.fields} eventId={eventId} includeRegistration onLookup={(result) => setEditToken(result.registration?.token ?? "")} onReadyChange={(value) => { setReady(value); if (!value) setEditToken(""); }} />
          {ready && <>
          <p className="privacy-note">
            Usaremos estos datos exclusivamente para gestionar tu inscripción,
            asistencia{offersCertificate ? " y certificado" : ""}.
          </p>
          <SubmitButton pendingLabel="Confirmando inscripción…">
            {editToken ? "Guardar cambios en mi inscripción" : "Confirmar inscripción"}
          </SubmitButton>
          </>}
        </>
      )}
    </form>
  );
}
