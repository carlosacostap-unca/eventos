import Link from "next/link";
import { notFound } from "next/navigation";

import { EventAdminNav } from "@/components/event-admin-nav";
import { calculateEventMetrics } from "@/lib/domain/metrics";
import type { RegistrationFilters } from "@/lib/services/registrations";
import { getEventById } from "@/lib/services/events";
import { listRegistrations } from "@/lib/services/registrations";
import { listModalities } from "@/lib/services/modalities";
import { eventExhibitions } from "@/lib/services/modal-registration";
import { ParticipantFilters } from "@/components/participant-filters";
import { createServicePocketBase } from "@/lib/pocketbase/client";

function normalizeFilters(input: { q?: string; source?: string; attendance?: string; modality?: string; role?: string }): RegistrationFilters {
  return {
    modality: input.modality || undefined,
    role: input.role || undefined,
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
  searchParams: Promise<{ q?: string; source?: string; attendance?: string; modality?: string; role?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const event = await getEventById(id);
  if (!event) notFound();

  const filters = normalizeFilters(query);
  const registrations = await listRegistrations(id, filters);
  const allRegistrations = await listRegistrations(id);
  const metrics = calculateEventMetrics(allRegistrations);
  const [modes, groups] = await Promise.all([listModalities(id), eventExhibitions(id)]);
  const pb = await createServicePocketBase();
  const certificates = await pb.collection("certificados").getFullList({ filter: pb.filter("evento = {:id}", { id }), fields: "id,modalidad,exposicion" });
  const reservations = allRegistrations.filter((p) => p.origen === "publica" && p.numero_cupo_publico > 0).length;
  const exportQuery = new URLSearchParams();
  if (filters.query) exportQuery.set("q", filters.query);
  if (filters.source) exportQuery.set("source", filters.source);
  if (filters.attendance) exportQuery.set("attendance", filters.attendance);
  if (filters.modality) exportQuery.set("modality", filters.modality);
  if (filters.role) exportQuery.set("role", filters.role);
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
        <a className="button button-secondary" href={exportUrl + (exportQuery.size ? "&" : "?") + "groups=1"}>Exportar integrantes por exposición</a>
      </div>
      <EventAdminNav event={event} />

      <section className="metric-grid">
        <article className="metric-card">
          <span>Total</span>
          <strong>{metrics.total}</strong>
          <small>{metrics.publicas} personas de origen público</small>
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

      <section className="panel"><h2>Participación por modalidad</h2><p>{reservations} reservas principales de {event.cupo} lugares públicos · {groups.exhibitions.length} exposiciones · {certificates.length} documentos emitidos</p><div className="table-wrap"><table><thead><tr><th>Modalidad</th><th>Personas únicas</th><th>Acreditadas</th><th>Porcentaje</th><th>PDFs emitidos</th></tr></thead><tbody>{modes.map((mode) => { const people = allRegistrations.filter((p) => p.modalidad === mode.id); const present = people.filter((p) => p.acreditado).length; return <tr key={mode.id}><td>{mode.nombre}</td><td>{people.length}</td><td>{present}</td><td>{people.length ? Math.round(present * 100 / people.length) : 0}%</td><td>{certificates.filter((c) => c.modalidad === mode.id).length}</td></tr>; })}</tbody></table></div></section>

      <section className="panel">
        <ParticipantFilters modes={modes} members={groups.members} filters={filters} />


        <div className="catalog-summary"><p>{registrations.length} participantes en el reporte</p>{(filters.query || filters.source || filters.attendance) && <Link className="text-link" href={"/admin/eventos/" + id + "/reportes"}>Limpiar filtros</Link>}</div>
        <div className="table-wrap" role="region" aria-label="Listado de participantes" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Participante</th>
                <th>Documento</th>
                <th>Modalidad y funciones</th>
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
                  <td>{modes.find((m) => m.id === registration.modalidad)?.nombre ?? "Asistente"}<small>{[...new Set(groups.members.filter((m) => m.participante === registration.id).map((m) => m.etiqueta))].join(", ")}</small></td>
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
