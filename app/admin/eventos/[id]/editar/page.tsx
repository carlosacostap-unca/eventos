import Link from "next/link";
import { notFound } from "next/navigation";

import { EventAdminNav } from "@/components/event-admin-nav";
import { EventForm } from "@/components/event-form";
import { getEventById } from "@/lib/services/events";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();
  return (
    <main className="admin-main narrow">
      <Link className="back-link" href={"/admin/eventos/" + id}>
        ← Volver al evento
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1>{event.titulo}</h1>
        </div>
      </div>
      <EventAdminNav event={event} />
      <EventForm event={event} />
    </main>
  );
}
