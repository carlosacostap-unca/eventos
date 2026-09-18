import Link from "next/link";

import { listEvents } from "@/lib/services/events";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export default async function AdminPage() {
  const events = await listEvents();
  return (
    <main className="admin-main">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Panel administrativo</p>
          <h1>Eventos</h1>
          <p>Creá actividades y seguí cada etapa desde la inscripción al certificado.</p>
        </div>
        <Link className="button button-primary" href="/admin/eventos/nuevo">
          Crear evento
        </Link>
      </div>

      {events.length === 0 ? (
        <section className="empty-state panel">
          <h2>Creá tu primer evento</h2>
          <p>Definí el cupo, publicá el formulario y comenzá a recibir inscripciones.</p>
          <Link className="button button-primary" href="/admin/eventos/nuevo">
            Empezar
          </Link>
        </section>
      ) : (
        <section className="admin-event-list">
          {events.map((event) => (
            <Link className="admin-event-row" href={"/admin/eventos/" + event.id} key={event.id}>
              <div>
                <span className={"status-dot status-" + event.estado} />
                <strong>{event.titulo}</strong>
                <small>{event.lugar}</small>
              </div>
              <div className="admin-event-meta">
                <span>{formatDate(event.inicio)}</span>
                <span>{event.cupo} lugares</span>
                <span className="row-arrow">→</span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
