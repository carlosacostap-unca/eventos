import Link from "next/link";
import { notFound } from "next/navigation";

import { RegistrationForm } from "@/components/registration-form";
import { getRegistrationAvailability } from "@/lib/domain/events";
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
  const count = await countPublicRegistrations(event.id);
  const availability = getRegistrationAvailability(event, count);
  const remaining = Math.max(0, event.cupo - count);

  return (
    <main className="public-event">
      <section className="event-hero">
        <div className="container">
          <Link className="brand-link brand-link-light" href="/">
            <span className="brand-mark">UNCA</span>
            <span>Eventos</span>
          </Link>
          <div className="event-hero-copy">
            <span className={"badge badge-" + availability}>{availability}</span>
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
                <dt>Disponibilidad</dt>
                <dd>
                  {availability === "disponible"
                    ? remaining +
                      (remaining === 1
                        ? " lugar disponible"
                        : " lugares disponibles")
                    : "Inscripción no disponible"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
      <section className="container registration-section">
        {availability === "disponible" ? (
          <RegistrationForm slug={slug} />
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
