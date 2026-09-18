import Link from "next/link";

import { getRegistrationAvailability } from "@/lib/domain/events";
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
  const events = await listPublishedEvents();
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
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="brand-mark">UNCA</span>
            <p className="eyebrow">Universidad Nacional de Catamarca</p>
            <h1>Encuentros que dejan huella.</h1>
            <p className="hero-copy">
              Descubrí jornadas, conferencias y actividades abiertas. Inscribite en
              pocos pasos y recibí tu certificado después de participar.
            </p>
          </div>
          <div className="hero-card" aria-hidden="true">
            <span>Agenda</span>
            <strong>{events.length}</strong>
            <small>
              {events.length === 1 ? "evento publicado" : "eventos publicados"}
            </small>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Próximas actividades</p>
            <h2>Elegí tu próximo evento</h2>
          </div>
          <Link className="text-link" href="/iniciar-sesion">
            Acceso administrativo
          </Link>
        </div>

        {cards.length === 0 ? (
          <div className="empty-state">
            <h3>No hay eventos publicados todavía</h3>
            <p>Volvé pronto para conocer las próximas actividades.</p>
          </div>
        ) : (
          <div className="event-grid">
            {cards.map(({ event, availability }) => (
              <article className="event-card" key={event.id}>
                <div className="event-date">
                  <span>{new Date(event.inicio).getDate()}</span>
                  <small>
                    {new Intl.DateTimeFormat("es-AR", { month: "short" })
                      .format(new Date(event.inicio))
                      .replace(".", "")}
                  </small>
                </div>
                <div className="event-content">
                  <span className={"badge badge-" + availability}>
                    {availabilityLabels[availability]}
                  </span>
                  <h3>{event.titulo}</h3>
                  <p>{event.descripcion}</p>
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
                    href={"/eventos/" + event.slug}
                  >
                    Ver evento
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
