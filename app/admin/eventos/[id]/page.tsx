import Link from "next/link";
import { notFound } from "next/navigation";

import { EventAdminNav } from "@/components/event-admin-nav";
import { EventSharePanel } from "@/components/event-share-panel";
import { calculateEventMetrics } from "@/lib/domain/metrics";
import { getRegistrationAvailability } from "@/lib/domain/events";
import { getEventById } from "@/lib/services/events";
import {
  countPublicRegistrations,
  listRegistrations,
} from "@/lib/services/registrations";

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();
  const registrations = await listRegistrations(id);
  const metrics = calculateEventMetrics(registrations);
  const availability = getRegistrationAvailability(
    event,
    await countPublicRegistrations(id),
  );

  return (
    <main className="admin-main">
      <Link className="back-link" href="/admin">
        ← Todos los eventos
      </Link>
      <div className="page-heading">
        <div>
          <div className="heading-badges">
            <span className={"badge badge-" + event.estado}>{event.estado}</span>
            <span className={"badge badge-" + availability}>{availability}</span>
          </div>
          <h1>{event.titulo}</h1>
          <p>{event.lugar}</p>
        </div>
        <Link className="button button-secondary" href={"/eventos/" + event.slug}>
          Ver página pública
        </Link>
      </div>
      <EventAdminNav event={event} />

      <section className="metric-grid">
        <article className="metric-card">
          <span>Participantes</span>
          <strong>{metrics.total}</strong>
          <small>{event.cupo} lugares públicos</small>
        </article>
        <article className="metric-card">
          <span>Acreditados</span>
          <strong>{metrics.acreditados}</strong>
          <small>{metrics.porcentajeAsistencia}% de asistencia</small>
        </article>
        <article className="metric-card">
          <span>Altas presenciales</span>
          <strong>{metrics.presenciales}</strong>
          <small>registradas en el evento</small>
        </article>
        <article className="metric-card">
          <span>Ausentes</span>
          <strong>{metrics.ausentes}</strong>
          <small>sin acreditación</small>
        </article>
      </section>

      <EventSharePanel
        eventTitle={event.titulo}
        publicPath={`/eventos/${encodeURIComponent(event.slug)}`}
        slug={event.slug}
      />

      <section className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Estado operativo</p>
            <h2>Próximos pasos</h2>
          </div>
        </div>
        <div className="step-list">
          <Link href={"/admin/eventos/" + id + "/editar"}>
            <span>01</span>
            <div>
              <strong>Revisar configuración</strong>
              <small>Cupo, fechas, publicación y formulario.</small>
            </div>
          </Link>
          <Link href={"/admin/eventos/" + id + "/acreditacion"}>
            <span>02</span>
            <div>
              <strong>Acreditar asistentes</strong>
              <small>Buscar inscriptos o agregar personas en puerta.</small>
            </div>
          </Link>
          <Link href={"/admin/eventos/" + id + "/certificados"}>
            <span>03</span>
            <div>
              <strong>Emitir certificados</strong>
              <small>Previsualizar, generar y controlar los envíos.</small>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
