import Link from "next/link";
import { notFound } from "next/navigation";

import { EventAdminNav } from "@/components/event-admin-nav";
import { calculateEventMetrics } from "@/lib/domain/metrics";
import type { RegistrationFilters } from "@/lib/services/registrations";
import { getEventById } from "@/lib/services/events";
import { listRegistrations } from "@/lib/services/registrations";

function normalizeFilters(input: { q?: string; source?: string; attendance?: string }): RegistrationFilters {
  return {
    query: input.q?.trim() || undefined,
    source:
      input.source === "publica" || input.source === "presencial"
        ? input.source
        : undefined,
    attendance:
      input.attendance === "acreditado" || input.attendance === "ausente"
        ? input.attendance
        : undefined,
  };
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; source?: string; attendance?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const event = await getEventById(id);
  if (!event) notFound();

  const filters = normalizeFilters(query);
  const registrations = await listRegistrations(id, filters);
  const allRegistrations = await listRegistrations(id);
  const metrics = calculateEventMetrics(allRegistrations);
  const exportQuery = new URLSearchParams();
  if (filters.query) exportQuery.set("q", filters.query);
  if (filters.source) exportQuery.set("source", filters.source);
  if (filters.attendance) exportQuery.set("attendance", filters.attendance);
  const exportUrl =
    "/api/admin/eventos/" +
    id +
    "/exportar" +
    (exportQuery.size ? "?" + exportQuery.toString() : "");

  return (
    <main className="admin-main">
      <Link className="back-link" href={"/admin/eventos/" + id}>
        ← Volver al evento
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Resultados</p>
          <h1>Reportes</h1>
          <p>{event.titulo}</p>
        </div>
        <a className="button button-primary" href={exportUrl}>
          Exportar CSV
        </a>
      </div>
      <EventAdminNav event={event} />

      <section className="metric-grid">
        <article className="metric-card">
          <span>Total</span>
          <strong>{metrics.total}</strong>
          <small>{metrics.publicas} públicas</small>
        </article>
        <article className="metric-card">
          <span>Presenciales</span>
          <strong>{metrics.presenciales}</strong>
          <small>altas en puerta</small>
        </article>
        <article className="metric-card">
          <span>Acreditados</span>
          <strong>{metrics.acreditados}</strong>
          <small>{metrics.porcentajeAsistencia}% de asistencia</small>
        </article>
        <article className="metric-card">
          <span>Ausentes</span>
          <strong>{metrics.ausentes}</strong>
          <small>sin acreditación</small>
        </article>
      </section>

      <section className="panel">
        <form className="filter-bar">
          <label>
            <span>Buscar</span>
            <input
              name="q"
              defaultValue={filters.query}
              placeholder="Nombre, email o documento"
            />
          </label>
          <label>
            <span>Origen</span>
            <select name="source" defaultValue={filters.source || ""}>
              <option value="">Todos</option>
              <option value="publica">Pública</option>
              <option value="presencial">Presencial</option>
            </select>
          </label>
          <label>
            <span>Asistencia</span>
            <select name="attendance" defaultValue={filters.attendance || ""}>
              <option value="">Todos</option>
              <option value="acreditado">Acreditados</option>
              <option value="ausente">Ausentes</option>
            </select>
          </label>
          <button className="button button-secondary" type="submit">
            Aplicar filtros
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Participante</th>
                <th>Documento</th>
                <th>Origen</th>
                <th>Estado</th>
                <th>Inscripción</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((registration) => (
                <tr key={registration.id}>
                  <td>
                    <strong>
                      {registration.apellidos}, {registration.nombres}
                    </strong>
                    <small>{registration.email}</small>
                  </td>
                  <td>{registration.documento}</td>
                  <td>{registration.origen === "publica" ? "Pública" : "Presencial"}</td>
                  <td>
                    <span
                      className={
                        registration.acreditado
                          ? "status-dot status-success"
                          : "status-dot status-muted"
                      }
                    >
                      {registration.acreditado ? "Acreditado" : "Ausente"}
                    </span>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(registration.created))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registrations.length === 0 ? (
            <div className="empty-inline">No hay resultados para estos filtros.</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
