import Image from "next/image";
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
      <header className="landing-header">
        <div className="container landing-brand">
          <Image
            className="landing-logo"
            src="/images/logo-ftyca-blanco.png"
            alt="Facultad de Tecnología y Ciencias Aplicadas"
            width={80}
            height={94}
            priority
          />
          <h1>Eventos</h1>
        </div>
      </header>
      <section className="container section">
        {cards.length === 0 ? (
          <div className="empty-state">
            <h2>No hay eventos publicados todavía</h2>
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
                  <h2>{event.titulo}</h2>
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
