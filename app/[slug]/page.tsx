import Image from "next/image";
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

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.estado === "borrador") notFound();
  const [count, types, speakers] = await Promise.all([
    countPublicRegistrations(event.id),
    listEventTypes(),
    listSpeakersByEvent(event.id),
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
          <div className="event-hero-copy">
            {availability !== "disponible" && (
              <span className={"badge badge-" + availability}>
                {availability === "completo"
                  ? "Cupo completo"
                  : availability === "finalizado"
                    ? "Evento finalizado"
                    : "Inscripción cerrada"}
              </span>
            )}
            {event.tipo_evento && <p className="event-type-label">{eventTypeName(event.tipo_evento, types)}</p>}
            <h1>{event.titulo}</h1>
            <p>{event.descripcion}</p>
            <dl className="public-event-meta">
              <div>
                <dt>Fecha y hora</dt>
                <dd>{formatDate(event.inicio)}</dd>
              </div>
              <div>
                <dt>Lugar</dt>
                <dd>{event.lugar}</dd>
              </div>
              <div>
                <dt>Participación</dt>
                <dd>{isEventFree(event) ? "Gratuita" : "Arancelada"}</dd>
              </div>
              <div>
                <dt>Certificado de asistencia</dt>
                <dd>{offersAttendanceCertificate(event) ? "Se entregará" : "No se entregará"}</dd>
              </div>
            </dl>
          </div>
          {speakers.length > 0 && (
            <section className="speaker-section" aria-labelledby="speakers-heading">
              <h2 id="speakers-heading">
                {speakers.length === 1 ? "Disertante" : "Disertantes"}
              </h2>
              <div className="speaker-grid">
                {speakers.map((speaker) => <SpeakerCard speaker={speaker} key={speaker.id} />)}
              </div>
            </section>
          )}
        </div>
      </section>
      <section className="container registration-section">
        {availability === "disponible" ? (
          <RegistrationForm slug={slug} offersCertificate={offersAttendanceCertificate(event)} />
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
          </div>
        )}
      </section>
    </main>
  );
}
