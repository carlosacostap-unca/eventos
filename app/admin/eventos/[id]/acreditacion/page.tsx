import { requireEventAccess } from "@/lib/auth/event-access";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { publicModalities, listModalities, modalityVersion } from "@/lib/services/modalities";
import { eventExhibitions } from "@/lib/services/modal-registration";
import { ParticipantFilters } from "@/components/participant-filters";
import type { RegistrationFilters } from "@/lib/services/registrations";
import { notFound } from "next/navigation";

import { toggleAttendanceAction } from "@/app/actions/registrations";
import { EventAdminNav } from "@/components/event-admin-nav";
import { WalkInForm } from "@/components/walk-in-form";
import { RegistrationEditForm } from "@/components/registration-edit-form";
import { SubmitButton } from "@/components/submit-button";
import { getEventById } from "@/lib/services/events";
import { isCapacityFull } from "@/lib/domain/events";
import {
  countPublicRegistrations,
  countOccupiedPlaces,
  listRegistrationsPage,
} from "@/lib/services/registrations";

function pageHref(eventId: string, query: string, page: number, filters: RegistrationFilters) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  if (filters.modality) params.set("modality", filters.modality);
  if (filters.role) params.set("role", filters.role);
  if (filters.source) params.set("source", filters.source);
  if (filters.attendance) params.set("attendance", filters.attendance);
  return "/admin/eventos/" + eventId + "/acreditacion?" + params.toString();
}

export default async function AccreditationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string; modality?: string; role?: string; source?: string; attendance?: string }>;
}) {
  const { id } = await params;
  const access = await requireEventAccess(id, "accredit");
  const query = await searchParams;
  const q = query.q?.trim() || "";
  const requestedPage = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const event = await getEventById(id);
  if (!event) notFound();

  const filters: RegistrationFilters = { query: q || undefined, modality: query.modality || undefined, role: query.role || undefined, source: query.source === "publica" || query.source === "presencial" ? query.source : undefined, attendance: query.attendance === "acreditado" || query.attendance === "ausente" ? query.attendance : undefined };
  const canManage = access.eventRole === "administrador_evento";
  const [result, publicCount, modes, publicModes, groups] = await Promise.all([
    listRegistrationsPage(id, filters, requestedPage, 40),
    canManage ? countPublicRegistrations(id) : countOccupiedPlaces(id),
    listModalities(id), publicModalities(event), eventExhibitions(id),
  ]);
  const versions = new Map(await Promise.all([...new Set(result.items.map((r) => r.version_formulario).filter((v): v is string => !!v))].map(async (v) => [v, await modalityVersion(v)] as const)));

  return (
    <main className="admin-main">
      <Link className="back-link" href={canManage ? "/admin/eventos/" + id : "/admin"}>
        {canManage ? "← Volver al evento" : "← Mis eventos"}
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operación en puerta</p>
          <h1>Acreditación</h1>
          <p>{event.titulo}</p>
        </div>
      </div>
      <EventAdminNav event={event} />

      <section className="accreditation-layout">
        <div className="panel">
          <ParticipantFilters modes={modes} members={groups.members} filters={filters} />

          <div className="catalog-summary"><p>{result.totalItems} participantes{q ? " encontrados" : " registrados"}</p>{q && <Link className="text-link" href={"/admin/eventos/" + id + "/acreditacion"}>Limpiar búsqueda</Link>}</div>
          <div className="participant-list">
            {result.items.length === 0 ? (
              <div className="empty-inline">No encontramos participantes.</div>
            ) : (
              result.items.map((registration) => (
                <article className="participant-row" key={registration.id}>
                  <div className="participant-avatar">
                    {registration.nombres.charAt(0)}
                    {registration.apellidos.charAt(0)}
                  </div>
                  <div className="participant-info">
                    <strong>
                      {registration.apellidos}, {registration.nombres}
                    </strong>
                    <span>
                      {registration.documento} · {registration.email}
                    </span>
                    <small>
                      {registration.origen === "presencial"
                        ? "Alta presencial"
                        : "Inscripción pública"}
                    </small>
                    <small><strong>{modes.find((m) => m.id === registration.modalidad)?.nombre ?? "Asistente"}</strong>{registration.tipo_alta === "vinculada" ? " · Integrante vinculado" : ""}</small>
                    {canManage && groups.members.filter((m) => m.participante === registration.id).map((m) => <small key={m.id}>{m.etiqueta} · <Link className="text-link" href={`/admin/eventos/${id}/exposiciones#${m.exposicion}`}>Ver exposición</Link></small>)}
                  </div>
                  <form action={toggleAttendanceAction}>
                    <input type="hidden" name="registrationId" value={registration.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <input
                      type="hidden"
                      name="accredited"
                      value={registration.acreditado ? "false" : "true"}
                    />
                    <SubmitButton
                      className={
                        registration.acreditado
                          ? "button button-success"
                          : "button button-secondary"
                      }
                      pendingLabel="Actualizando…"
                    >
                      {registration.acreditado ? "✓ Acreditado" : "Acreditar"}
                    </SubmitButton>
                  </form>
                  {canManage && <div className="participant-edit">
                    <RegistrationEditForm registration={registration} fields={versions.get(registration.version_formulario ?? "")?.esquema.fields} />
                  </div>}
                </article>
              ))
            )}
          </div>
          {result.totalPages > 1 ? (
            <nav className="pagination" aria-label="Páginas de participantes">
              {result.page > 1 ? (
                <Link href={pageHref(id, q, result.page - 1, filters)}>← Anterior</Link>
              ) : (
                <span />
              )}
              <span>
                Página {result.page} de {result.totalPages} · {result.totalItems} personas
              </span>
              {result.page < result.totalPages ? (
                <Link href={pageHref(id, q, result.page + 1, filters)}>Siguiente →</Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>
        <WalkInForm eventId={id} isFull={isCapacityFull(event, publicCount)} modes={publicModes} operation={randomUUID()} allowException={canManage} />
      </section>
    </main>
  );
}
