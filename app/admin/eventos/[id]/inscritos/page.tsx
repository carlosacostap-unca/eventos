import Link from "next/link";
import { notFound } from "next/navigation";

import { EventAdminNav } from "@/components/event-admin-nav";
import { requireEventAccess } from "@/lib/auth/event-access";
import { getEventById } from "@/lib/services/events";
import { listRegistrationNames } from "@/lib/services/registrations";

export default async function RegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEventAccess(id);
  const event = await getEventById(id);
  if (!event) notFound();
  const registrations = await listRegistrationNames(id);

  return (
    <main className="admin-main">
      <Link className="back-link" href={"/admin/eventos/" + id}>← Volver al evento</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Participantes</p>
          <h1>Inscritos</h1>
          <p>{event.titulo}</p>
        </div>
      </div>
      <EventAdminNav event={event} />
      <section className="panel" aria-label="Personas inscritas">
        <p className="muted">{registrations.length} {registrations.length === 1 ? "persona inscrita" : "personas inscritas"}</p>
        {registrations.length ? (
          <ul className="registration-name-list">
            {registrations.map(person => <li key={person.id}>{person.apellidos}, {person.nombres}</li>)}
          </ul>
        ) : (
          <p className="empty-inline">Todavía no hay personas inscritas en este evento.</p>
        )}
      </section>
    </main>
  );
}
