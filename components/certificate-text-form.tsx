"use client";

import { useActionState } from "react";

import { saveCertificateTextsAction } from "@/app/actions/certificates";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { resolveCertificateTexts } from "@/lib/domain/certificate-texts";
import type { EventRecord } from "@/lib/domain/models";

export function CertificateTextForm({ event }: { event: EventRecord }) {
  const texts = resolveCertificateTexts(event.textos_certificado);
  const action = saveCertificateTextsAction.bind(null, event.id);
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <article className="panel certificate-text-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Contenido</p>
          <h2>Textos del certificado</h2>
        </div>
      </div>
      <p className="muted">
        Personalizá cada sección para este evento. Podés usar las variables{" "}
        <code>{"{participante}"}</code>, <code>{"{documento}"}</code>,{" "}
        <code>{"{evento}"}</code>, <code>{"{tipoEvento}"}</code>, <code>{"{horas}"}</code>, <code>{"{lugar}"}</code> y{" "}
        <code>{"{fecha}"}</code>. Dejá una sección vacía para ocultarla.
      </p>
      <FormMessage message={state.message} success={state.ok} />
      <form action={formAction} className="form-stack certificate-text-form">
        <fieldset className="certificate-text-group">
          <legend>Encabezado institucional</legend>
          <p className="muted">
            Estas dos líneas se muestran con la plantilla predeterminada.
          </p>
          <div className="certificate-text-grid">
            <label className="field">
              <span>Encabezado principal</span>
              <input
                name="institutionPrimary"
                defaultValue={texts.institutionPrimary}
                maxLength={120}
              />
              <FieldError errors={state.fields?.institutionPrimary} />
            </label>
            <label className="field">
              <span>Encabezado secundario</span>
              <input
                name="institutionSecondary"
                defaultValue={texts.institutionSecondary}
                maxLength={120}
              />
              <FieldError errors={state.fields?.institutionSecondary} />
            </label>
          </div>
        </fieldset>

        <fieldset className="certificate-text-group">
          <legend>Cuerpo</legend>
          <div className="certificate-text-grid">
            <label className="field certificate-text-wide">
              <span>Introducción</span>
              <textarea
                name="introduction"
                defaultValue={texts.introduction}
                maxLength={300}
                rows={2}
              />
              <FieldError errors={state.fields?.introduction} />
            </label>
            <label className="field">
              <span>Participante</span>
              <input
                name="participant"
                defaultValue={texts.participant}
                maxLength={180}
              />
              <FieldError errors={state.fields?.participant} />
            </label>
            <label className="field">
              <span>Documento</span>
              <input
                name="document"
                defaultValue={texts.document}
                maxLength={120}
              />
              <FieldError errors={state.fields?.document} />
            </label>
            <label className="field certificate-text-wide">
              <span>Descripción de la participación</span>
              <textarea
                name="participation"
                defaultValue={texts.participation}
                maxLength={240}
                rows={2}
              />
              <FieldError errors={state.fields?.participation} />
              <small>
                Usá {"{tipoEvento}"} para el tipo y {"{horas}"} para la duración
                entre el inicio y el fin del evento.
                Ejemplo: {"ha participado de la actividad de tipo {tipoEvento} de {horas} horas:"}
              </small>
            </label>
            <label className="field">
              <span>Evento</span>
              <input name="event" defaultValue={texts.event} maxLength={240} />
              <FieldError errors={state.fields?.event} />
            </label>
            <label className="field">
              <span>Lugar y fecha</span>
              <input
                name="locationAndDate"
                defaultValue={texts.locationAndDate}
                maxLength={240}
              />
              <FieldError errors={state.fields?.locationAndDate} />
            </label>
          </div>
        </fieldset>

        <fieldset className="certificate-text-group">
          <legend>Autoridades y firmas</legend>
          <p className="muted">
            Estos textos acompañan las dos firmas del diseño institucional.
            Las imágenes de las firmas se mantienen; no se agregan sobre fondos personalizados.
          </p>
          <div className="certificate-text-grid">
            {([
              { title: "Firma izquierda", fields: [
                { key: "signatureLeftName", label: "Nombre y título", max: 120 },
                { key: "signatureLeftRole", label: "Cargo", max: 120 },
                { key: "signatureLeftInstitution", label: "Institución", max: 160 },
              ] },
              { title: "Firma derecha", fields: [
                { key: "signatureRightName", label: "Nombre y título", max: 120 },
                { key: "signatureRightRole", label: "Cargo", max: 120 },
                { key: "signatureRightInstitution", label: "Institución", max: 160 },
              ] },
            ] as const).map((signature) => (
              <fieldset className="certificate-text-group" key={signature.title}>
                <legend>{signature.title}</legend>
                {signature.fields.map((field) => (
                  <label className="field" key={field.key}>
                    <span>{field.label}</span>
                    <input name={field.key} defaultValue={texts[field.key]} maxLength={field.max} />
                    <FieldError errors={state.fields?.[field.key]} />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </fieldset>

        <div className="actions-row">
          <SubmitButton pendingLabel="Guardando textos…">
            Guardar textos
          </SubmitButton>
          <small className="muted">
            La vista previa usa la última configuración guardada. Los certificados
            ya emitidos conservan su contenido original.
          </small>
        </div>
      </form>
    </article>
  );
}
