import Image from "next/image";
import { randomUUID } from "node:crypto";
import { publicModalities } from "@/lib/services/modalities";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RegistrationForm } from "@/components/registration-form";
import { SpeakerCard } from "@/components/speaker-card";
import { isEventFree, offersAttendanceCertificate } from "@/lib/domain/event-details";
import { listSpeakersByEvent } from "@/lib/services/speakers";
import { getRegistrationAvailability } from "@/lib/domain/events";
import { eventTypeName } from "@/lib/domain/event-types";
import { listEventTypes } from "@/lib/services/event-types";
import { getEventBySlug } from "@/lib/services/events";
import { countPublicRegistrations } from "@/lib/services/registrations";
import { resolvePublicEventPage } from "@/lib/domain/public-event-page";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const formatted = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(",", "");
}

function formatDuration(start: string, end: string) {
  const totalMinutes = Math.round((Date.parse(end) - Date.parse(start)) / 60000);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "No especificada";

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days ? `${days} ${days === 1 ? "día" : "días"}` : "",
    hours ? `${hours} ${hours === 1 ? "hora" : "horas"}` : "",
    minutes ? `${minutes} ${minutes === 1 ? "minuto" : "minutos"}` : "",
  ].filter(Boolean);
  return parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`;
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.estado === "borrador") notFound();
  const visible = resolvePublicEventPage(event.pagina_publica);
  const [count, types, speakers, modes] = await Promise.all([
    countPublicRegistrations(event.id),
    visible.tipoEvento ? listEventTypes() : Promise.resolve([]),
    visible.disertantes ? listSpeakersByEvent(event.id) : Promise.resolve([]),
    publicModalities(event),
  ]);
  const availability = getRegistrationAvailability(event, count);

  return (
    <main className="public-event">
      <section className="event-hero">
        <div className="container">
          <Link className="public-event-logo-link" href="/">
            <Image
              className="public-event-logo"
              src="/images/logo-ftyca-blanco.png"
              alt="Facultad de Tecnología y Ciencias Aplicadas"
              width={96}
              height={113}
              priority
            />
          </Link>
          <nav className="public-page-nav" aria-label="Navegación del evento"><Link href="/">← Todos los eventos</Link><Link href="/mis-certificados">Mis certificados</Link></nav>
          <div className="event-hero-copy">
            {availability === "disponible" && <span className="badge badge-disponible">Inscripción abierta</span>}
            {availability !== "disponible" && (
              <span className={"badge badge-" + availability}>
                {availability === "completo"
                  ? "Cupo completo"
                  : availability === "finalizado"
                    ? "Evento finalizado"
                    : "Inscripción cerrada"}
              </span>
            )}
            {visible.tipoEvento && event.tipo_evento && <p className="event-type-label">{eventTypeName(event.tipo_evento, types)}</p>}
            <h1>{event.titulo}</h1>
            {visible.descripcion && <p>{event.descripcion}</p>}
            {[visible.fechaHora, visible.duracion, visible.lugar, visible.participacion, visible.certificados].some(Boolean) && <dl className="public-event-meta">
              {visible.fechaHora && <div>
                <dt>Fecha y hora</dt>
                <dd>{formatDate(event.inicio)}</dd>
              </div>}
              {visible.duracion && <div>
                <dt>Duración</dt>
                <dd>{formatDuration(event.inicio, event.fin)}</dd>
              </div>}
              {visible.lugar && <div>
                <dt>Lugar</dt>
                <dd>{event.lugar}</dd>
              </div>}
              {visible.participacion && <div>
                <dt>Participación</dt>
                <dd>{isEventFree(event) ? "Gratuita" : "Arancelada"}</dd>
              </div>}
              {visible.certificados && <div>
                <dt>Certificados</dt>
                <dd>{modes.some((m) => m.id !== "legacy") ? modes.map((m) => `${m.nombre}: ${m.entrega ? "sí" : "no"}`).join(" · ") : offersAttendanceCertificate(event) ? "Se entregará" : "No se entregará"}</dd>
              </div>}
            </dl>}
            {availability === "disponible" && <a className="button button-primary" href="#inscripcion">Reservar mi lugar <span aria-hidden="true">↓</span></a>}
          </div>
          {speakers.length > 0 && (
            <section className="speaker-section" aria-labelledby="speakers-heading">
              <h2 id="speakers-heading">
                {speakers.length === 1 ? "Disertante" : "Disertantes"}
              </h2>
              <div className="speaker-grid">
                {speakers.map((speaker) => <SpeakerCard speaker={speaker} key={speaker.id} unoptimized />)}
              </div>
            </section>
          )}
        </div>
      </section>
      <section className="container registration-section" id="inscripcion">
        {availability === "disponible" ? (
          <RegistrationForm slug={slug} eventId={event.id} modes={modes} operation={randomUUID()} offersCertificate={offersAttendanceCertificate(event)} />
        ) : (
          <div className="panel closed-panel">
            <p className="eyebrow">Inscripción</p>
            <h2>
              {availability === "completo"
                ? "El cupo está completo"
                : availability === "finalizado"
                  ? "El evento ya finalizó"
                  : "La inscripción está cerrada"}
            </h2>
            <p>Consultá con la organización si necesitás más información.</p>
            <Link className="button button-secondary" href="/">Explorar otros eventos</Link>
          </div>
        )}
      </section>
    </main>
  );
}
