import Image from "next/image";
import Link from "next/link";
import { EventCatalog } from "@/components/event-catalog";

import { getRegistrationAvailability } from "@/lib/domain/events";
import { isEventFree, offersAttendanceCertificate } from "@/lib/domain/event-details";
import { eventTypeName } from "@/lib/domain/event-types";
import { listEventTypes } from "@/lib/services/event-types";
import { listPublishedEvents } from "@/lib/services/events";
import { countPublicRegistrations } from "@/lib/services/registrations";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

const availabilityLabels = {
  disponible: "Inscripción abierta",
  cerrado: "Inscripción cerrada",
  completo: "Cupo completo",
  finalizado: "Evento finalizado",
} as const;

export default async function Home() {
  const [events, types] = await Promise.all([listPublishedEvents(), listEventTypes()]);
  const cards = await Promise.all(
    events.map(async (event) => {
      const count = await countPublicRegistrations(event.id);
      return {
        event,
        availability: getRegistrationAvailability(event, count),
      };
    }),
  );

  return (
    <main>
      <header className="landing-header">
        <div className="container landing-brand">
          <div className="landing-title">
            <Image
              className="landing-logo"
              src="/images/logo-ftyca-blanco.png"
              alt="Facultad de Tecnología y Ciencias Aplicadas"
              width={80}
              height={94}
              priority
            />
            <div><strong>Eventos UNCA</strong><small>Facultad de Tecnología y Ciencias Aplicadas</small></div>
          </div>
          <Link className="button button-ghost-light" href="/mis-certificados">
            Mis certificados
          </Link>
        </div>
        <div className="container agenda-intro">
          <p className="eyebrow">Aprender · Compartir · Conectar</p>
          <h1>Tu próximo encuentro<br />empieza acá.</h1>
          <p>Explorá las actividades de la facultad, reservá tu lugar y seguí sumando experiencias.</p>
          <a className="button button-primary" href="#agenda">Explorar la agenda <span aria-hidden="true">↓</span></a>
        </div>
      </header>
      <section className="container section" id="agenda">
        <div className="section-heading"><div><p className="eyebrow">Agenda de actividades</p><h2>Encontrá tu próximo evento</h2></div><p className="muted">Conocé los detalles e inscribite en línea.</p></div>
        {cards.length === 0 ? (
          <div className="empty-state">
            <h2>No hay eventos publicados todavía</h2>
            <p>Volvé pronto para conocer las próximas actividades.</p>
          </div>
        ) : (
          <EventCatalog items={cards.map(({ event, availability }) => ({
            id: event.id,
            search: `${event.titulo} ${event.lugar} ${eventTypeName(event.tipo_evento, types)}`,
            status: availability,
            content: (
              <article className="event-card" key={event.id}>
                <div className="event-date">
                  <span>{new Intl.DateTimeFormat("es-AR", { day: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(event.inicio))}</span>
                  <small>
                    {new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "America/Argentina/Buenos_Aires" })
                      .format(new Date(event.inicio))
                      .replace(".", "")}
                  </small>
                </div>
                <div className="event-content">
                  <span className={"badge badge-" + availability}>
                    {availabilityLabels[availability]}
                  </span>
                  {event.tipo_evento && <p className="event-type-label">{eventTypeName(event.tipo_evento, types)}</p>}
                  <h2>{event.titulo}</h2>
                  <p className="event-attribute-line">
                    {isEventFree(event) ? "Gratuito" : "Arancelado"} ·{" "}
                    {offersAttendanceCertificate(event) ? "Con certificado" : "Sin certificado"}
                  </p>
                  <p className="event-excerpt">{event.descripcion}</p>
                  <dl className="event-meta">
                    <div>
                      <dt>Cuándo</dt>
                      <dd>{formatDate(event.inicio)}</dd>
                    </div>
                    <div>
                      <dt>Dónde</dt>
                      <dd>{event.lugar}</dd>
                    </div>
                  </dl>
                  <Link
                    className="button button-primary"
                    href={"/" + event.slug}
                  >
                    {availability === "disponible" ? "Ver evento e inscribirme" : "Ver detalles del evento"} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ),
          }))} />
        )}
      </section>
      <footer className="site-footer container"><div><strong>Eventos UNCA</strong><p>Facultad de Tecnología y Ciencias Aplicadas</p></div><Link href="/mis-certificados">Mis certificados</Link><Link href="/iniciar-sesion">Acceso administrativo</Link></footer>
    </main>
  );
}
