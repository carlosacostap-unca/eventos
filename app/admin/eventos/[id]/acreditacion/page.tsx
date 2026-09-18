import Link from "next/link";
import { notFound } from "next/navigation";

import { toggleAttendanceAction } from "@/app/actions/registrations";
import { EventAdminNav } from "@/components/event-admin-nav";
import { WalkInForm } from "@/components/walk-in-form";
import { getEventById } from "@/lib/services/events";
import {
  countPublicRegistrations,
  listRegistrationsPage,
} from "@/lib/services/registrations";

function pageHref(eventId: string, query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return "/admin/eventos/" + eventId + "/acreditacion?" + params.toString();
}

export default async function AccreditationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const q = query.q?.trim() || "";
  const requestedPage = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const event = await getEventById(id);
  if (!event) notFound();

  const [result, publicCount] = await Promise.all([
    listRegistrationsPage(id, { query: q || undefined }, requestedPage, 40),
    countPublicRegistrations(id),
  ]);

  return (
    <main className="admin-main">
      <Link className="back-link" href={"/admin/eventos/" + id}>
        ← Volver al evento
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
          <form className="search-bar">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre, email o documento"
              aria-label="Buscar participantes"
            />
            <button className="button button-secondary" type="submit">
              Buscar
            </button>
          </form>
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
                  </div>
                  <form action={toggleAttendanceAction}>
                    <input type="hidden" name="registrationId" value={registration.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <input
                      type="hidden"
                      name="accredited"
                      value={registration.acreditado ? "false" : "true"}
                    />
                    <button
                      className={
                        registration.acreditado
                          ? "button button-success"
                          : "button button-secondary"
                      }
                      type="submit"
                    >
                      {registration.acreditado ? "✓ Acreditado" : "Acreditar"}
                    </button>
                  </form>
                </article>
              ))
            )}
          </div>
          {result.totalPages > 1 ? (
            <nav className="pagination" aria-label="Páginas de participantes">
              {result.page > 1 ? (
                <Link href={pageHref(id, q, result.page - 1)}>← Anterior</Link>
              ) : (
                <span />
              )}
              <span>
                Página {result.page} de {result.totalPages} · {result.totalItems} personas
              </span>
              {result.page < result.totalPages ? (
                <Link href={pageHref(id, q, result.page + 1)}>Siguiente →</Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>
        <WalkInForm eventId={id} isFull={publicCount >= event.cupo} />
      </section>
    </main>
  );
}
