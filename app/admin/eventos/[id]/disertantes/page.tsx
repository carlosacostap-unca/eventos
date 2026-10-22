import { assignedEventRoles, requireEventAccess } from "@/lib/auth/event-access";
import Link from "next/link";
import { notFound } from "next/navigation";

import { unlinkSpeakerAction } from "@/app/actions/speakers";
import { EventAdminNav } from "@/components/event-admin-nav";
import { SpeakerCard } from "@/components/speaker-card";
import { SpeakerForm } from "@/components/speaker-form";
import { SpeakerReuseForm } from "@/components/speaker-reuse-form";
import { getEventById } from "@/lib/services/events";
import { listAllSpeakers, listSpeakersByEvent } from "@/lib/services/speakers";

export default async function EventSpeakersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireEventAccess(id);
  const event = await getEventById(id);
  if (!event) notFound();
  const roles = await assignedEventRoles(access);
  const [speakers, catalog] = await Promise.all([
    listSpeakersByEvent(id),
    access.role === "admin" ? listAllSpeakers() : Promise.all([...roles].filter(([, role]) => role === "administrador_evento").map(([id]) => listSpeakersByEvent(id))).then(groups => [...new Map(groups.flat().map(s => [s.id, s])).values()]),
  ]);
  const linkedIds = new Set(speakers.map((speaker) => speaker.id));
  const availableSpeakers = catalog.filter((speaker) => !linkedIds.has(speaker.id));

  return (
    <main className="admin-main">
      <Link className="back-link" href={"/admin/eventos/" + id}>
        ← Volver al evento
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Programa</p>
          <h1>Disertantes</h1>
          <p>{event.titulo}</p>
        </div>
      </div>
      <EventAdminNav event={event} />

      <section className="speakers-admin-section">
        <h2>{speakers.length ? "Disertantes cargados" : "Todavía no hay disertantes"}</h2>
        {speakers.length ? (
          <div className="speaker-grid">
            {speakers.map((speaker) => (
              <div className="speaker-admin-item" key={speaker.id}>
                <SpeakerCard speaker={speaker} unoptimized />
                <div className="speaker-admin-actions">
                  <Link
                    className="text-link"
                    href={"/admin/eventos/" + id + "/disertantes/" + speaker.id + "/editar"}
                  >
                    Editar
                  </Link>
                  <form action={unlinkSpeakerAction.bind(null, id, speaker.id)}>
                    <button className="text-button" type="submit">Quitar del evento</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Agregá el primero para mostrarlo en la página pública del evento.</p>
        )}
      </section>

      <section className="speakers-admin-section narrow">
        <h2>Reutilizar disertante</h2>
        <p className="muted">Elegí un perfil ya cargado para usar su nombre, universidades y foto en este evento.</p>
        {availableSpeakers.length ? (
          <SpeakerReuseForm eventId={id} speakers={availableSpeakers} />
        ) : (
          <p>No hay otros disertantes disponibles todavía.</p>
        )}
      </section>

      <section className="speakers-admin-section narrow">
        <h2>Agregar nuevo disertante</h2>
        <SpeakerForm eventId={id} />
      </section>
    </main>
  );
}
