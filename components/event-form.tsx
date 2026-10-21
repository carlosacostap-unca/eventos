"use client";

import { useActionState, useState } from "react";

import {
  createEventAction,
  updateEventAction,
} from "@/app/actions/events";
import { initialActionState } from "@/app/actions/state";
import { FieldError, FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { toArgentinaDateTimeLocal } from "@/lib/domain/dates";
import type { EventRecord, EventTypeRecord } from "@/lib/domain/models";
import Link from "next/link";
import { PUBLIC_EVENT_PAGE_OPTIONS, resolvePublicEventPage } from "@/lib/domain/public-event-page";


export function EventForm({ event, types, certificatesConfigured = false }: { event?: EventRecord; types: EventTypeRecord[]; certificatesConfigured?: boolean }) {
  const action = event ? updateEventAction.bind(null, event.id) : createEventAction;
  const [state, formAction] = useActionState(action, initialActionState);
  const publicPage = resolvePublicEventPage(event?.pagina_publica);
  const [unlimitedCapacity, setUnlimitedCapacity] = useState(event?.cupo_ilimitado === true);
  const [capacity, setCapacity] = useState(String(event?.cupo ?? 100));
  const numericCapacity = Number(capacity);
  const savedCapacity = Number.isInteger(numericCapacity) && numericCapacity >= 1 && numericCapacity <= 100000 ? capacity : event?.cupo ?? 100;

  return (
    <form action={formAction} className="panel form-stack">
      <div><h2>Información del evento</h2><p className="muted">Definí qué se verá en la agenda y cómo podrán inscribirse los participantes.</p></div>
      <FormMessage message={state.message} />
      <div className="form-grid">
        <label className="field field-wide">
          <span>Título</span>
          <input name="titulo" defaultValue={event?.titulo} required />
          <FieldError errors={state.fields?.titulo} />
        </label>
        <label className="field">
          <span>Tipo de evento</span>
          <select name="tipoEvento" defaultValue={event?.tipo_evento ?? ""} required>
            <option value="" disabled>Seleccioná un tipo</option>
            {types.filter((type) => type.activo || type.id === event?.tipo_evento).map((type) => (
              <option key={type.id} value={type.id}>
                {type.nombre}{type.activo ? "" : " (inactivo)"}
              </option>
            ))}
          </select>
          <FieldError errors={state.fields?.tipoEvento} />
          {!types.some((type) => type.activo || type.id === event?.tipo_evento) && (
            <small>Primero <Link href="/admin/tipos">activá o creá un tipo de evento</Link>.</small>
          )}
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
          <small>Forma parte del enlace del evento. Usá minúsculas, números y guiones.</small>
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
          <small>Fecha y hora de Argentina.</small>
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
        <div className="field">
          <span>Cupo público</span>
          <input type="hidden" name="cupoConfigurado" value="1" />
          <label className="confirmation-check"><input name="cupoIlimitado" type="checkbox" checked={unlimitedCapacity} onChange={e => setUnlimitedCapacity(e.target.checked)} /> Sin límite de cupo</label>
          {unlimitedCapacity ? <input type="hidden" name="cupo" value={savedCapacity} /> : <label className="field"><span>Cantidad de lugares</span><input name="cupo" type="number" min="1" max="100000" value={capacity} onChange={e => setCapacity(e.target.value)} required /></label>}
          {unlimitedCapacity && <small>El cierre manual y la fecha de finalización siguen vigentes.</small>}
          <FieldError errors={state.fields?.cupo} />
          <FieldError errors={state.fields?.cupoIlimitado} />
        </div>
        <label className="field">
          <span>Participación</span>
          <select name="costo" defaultValue={event?.costo || "gratuito"}>
            <option value="gratuito">Gratuito</option>
            <option value="arancelado">Arancelado</option>
          </select>
          <FieldError errors={state.fields?.costo} />
        </label>
        {certificatesConfigured ? <div className="field"><span>Certificados por modalidad</span><input type="hidden" name="certificadoAsistencia" value={event?.certificado_asistencia || "si"} /><Link className="text-link" href={`/admin/eventos/${event!.id}/modalidades`}>Configurar entrega, plantilla y textos</Link></div> : <label className="field">
          <span>Certificado de asistencia inicial</span>
          <select name="certificadoAsistencia" defaultValue={event?.certificado_asistencia || "si"}>
            <option value="si">Sí, se entregará</option>
            <option value="no">No se entregará</option>
          </select>
          <FieldError errors={state.fields?.certificadoAsistencia} />
        </label>}
        <label className="field">
          <span>Estado</span>
          <select name="estado" defaultValue={event?.estado ?? "borrador"}>
            <option value="borrador">Borrador</option>
            <option value="publicado">Publicado</option>
            <option value="finalizado">Finalizado</option>
          </select>
          <FieldError errors={state.fields?.estado} />
          <small>Guardá como borrador para preparar el evento antes de publicarlo.</small>
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
      <fieldset className="form-stack">
        <legend>Página pública de inscripción</legend>
        <p className="muted">Elegí qué información mostrar en la página de inscripción de este evento. El título y el estado de inscripción siempre se muestran; el formulario aparece mientras la inscripción esté disponible. La entrega de certificados se configura en las modalidades.</p>
        <input type="hidden" name="paginaPublicaConfigurada" value="1" />
        <div className="form-grid">
          {PUBLIC_EVENT_PAGE_OPTIONS.map(({ key, label }) => <label className="confirmation-check" key={key}>
            <input type="checkbox" name={"paginaPublica_" + key} defaultChecked={publicPage[key]} />
            Mostrar {label.toLocaleLowerCase("es-AR")}
          </label>)}
        </div>
        <FieldError errors={state.fields?.paginaPublica} />
      </fieldset>
      <label className="switch-row">
        <input
          name="inscripcionHabilitada"
          type="checkbox"
          defaultChecked={event?.inscripcion_habilitada ?? false}
        />
        <span>
          <strong>Inscripción pública habilitada</strong>
          <small>{unlimitedCapacity ? "La inscripción no se cerrará por cantidad de participantes." : "También se cerrará automáticamente cuando se complete el cupo."}</small>
        </span>
      </label>
      {event ? (
        <p className="muted">Podés agregar varios disertantes desde la sección Disertantes de este evento.</p>
      ) : (
        <p className="muted">Después de crear el evento podrás agregar sus disertantes y fotos.</p>
      )}
      <div className="actions-row">
        <SubmitButton>{event ? "Guardar cambios" : "Crear evento"}</SubmitButton>
        <Link className="button button-secondary" href={event ? "/admin/eventos/" + event.id : "/admin"}>Cancelar</Link>
      </div>
    </form>
  );
}
