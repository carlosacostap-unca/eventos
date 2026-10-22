import { requireEventAccess } from "@/lib/auth/event-access";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventAdminNav } from "@/components/event-admin-nav";
import { SpeakerForm } from "@/components/speaker-form";
import { SpeakerCard } from "@/components/speaker-card";
import { getEventById } from "@/lib/services/events";
import { getSpeakerById, isSpeakerLinkedToEvent } from "@/lib/services/speakers";

export default async function EditSpeakerPage({
  params,
}: {
  params: Promise<{ id: string; speakerId: string }>;
}) {
  const { id, speakerId } = await params;
  const access = await requireEventAccess(id);
  const [event, speaker, linked] = await Promise.all([
    getEventById(id),
    getSpeakerById(speakerId),
    isSpeakerLinkedToEvent(id, speakerId),
  ]);
  if (!event || !speaker || !linked) notFound();

  return (
    <main className="admin-main narrow">
      <Link className="back-link" href={"/admin/eventos/" + id + "/disertantes"}>
        ← Volver a disertantes
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Disertante</p>
          <h1>{speaker.titulo} {speaker.nombre}</h1>
        </div>
      </div>
      <EventAdminNav event={event} />
      <div className="speaker-edit-preview"><SpeakerCard speaker={speaker} unoptimized /></div>
      <p className="muted">{access.role === "admin" ? "Los cambios de este perfil se verán en todos los eventos donde participe." : "Se guardará una copia del perfil para este evento. Los demás eventos conservarán el perfil actual."}</p>
      <SpeakerForm eventId={id} speaker={speaker} />
    </main>
  );
}
