import Link from "next/link";
import { publicCapacityLabel } from "@/lib/domain/events";
import { EventCatalog } from "@/components/event-catalog";
import { AdminLogin } from "@/components/admin-login";
import { getAuthenticatedStaff } from "@/lib/auth/session";
import { assignedEventRoles } from "@/lib/auth/event-access";

import { listEvents } from "@/lib/services/events";
import { eventTypeName } from "@/lib/domain/event-types";
import { listEventTypes } from "@/lib/services/event-types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export default async function AdminPage() {
  const admin = await getAuthenticatedStaff();
  if (!admin) return <AdminLogin />;

  const roles = await assignedEventRoles(admin);
  const [events, types] = await Promise.all([listEvents(admin.role === "admin" ? undefined : [...roles.keys()]), listEventTypes()]);
  return (
    <main className="admin-main">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Panel administrativo</p>
          <h1>Eventos</h1>
          <p>{admin.role === "admin" ? "Creá actividades y seguí cada etapa desde la inscripción al certificado." : "Accedé a los eventos en los que formás parte del equipo."}</p>
        </div>
        {admin.role === "admin" && <div className="actions-row">
          <Link className="button button-secondary" href="/admin/tipos">Tipos de eventos</Link>
          <Link className="button button-primary" href="/admin/eventos/nuevo">Crear evento</Link>
        </div>}
      </div>

      {events.length === 0 ? (
        <section className="empty-state panel">
          <h2>{admin.role === "admin" ? "Creá tu primer evento" : "No tenés eventos asignados"}</h2>
          <p>{admin.role === "admin" ? "Definí el cupo, publicá el formulario y comenzá a recibir inscripciones." : "El administrador general puede asignarte desde el equipo de cada evento."}</p>
          {admin.role === "admin" && <Link className="button button-primary" href="/admin/eventos/nuevo">
            Empezar
          </Link>}
        </section>
      ) : (
        <EventCatalog admin items={events.map((event) => ({
          id: event.id,
          search: `${event.titulo} ${event.lugar} ${eventTypeName(event.tipo_evento, types)}`,
          status: event.estado,
          content: (
            <Link className="admin-event-row" href={"/admin/eventos/" + event.id + (roles.get(event.id) === "acreditador" ? "/acreditacion" : "")} key={event.id}>
              <div>
                <span className={"badge badge-" + event.estado}>{event.estado}</span>
                <strong>{event.titulo}</strong>
                <small>{eventTypeName(event.tipo_evento, types)} · {event.lugar}</small>
                {admin.role !== "admin" && <small>{roles.get(event.id) === "acreditador" ? "Acreditador" : "Administrador de evento"}</small>}
              </div>
              <div className="admin-event-meta">
                <span>{formatDate(event.inicio)}</span>
                <span>{publicCapacityLabel(event)}</span>
              </div>
              <span className="row-arrow" aria-hidden="true">→</span>
            </Link>
          ),
        }))} />
      )}
    </main>
  );
}
