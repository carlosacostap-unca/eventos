import { assignedEventRoles, requireEventAccess } from "@/lib/auth/event-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, listEvents } from "@/lib/services/events";
import { listModalities, modalityVersion } from "@/lib/services/modalities";
import { ModalityEditor, CopyModalitiesForm } from "@/components/modality-editor";
import { EventAdminNav } from "@/components/event-admin-nav";

export default async function ModalitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireEventAccess(id);
  const event = await getEventById(id);
  if (!event) notFound();
  const roles = await assignedEventRoles(access);
  const [modes, events] = await Promise.all([listModalities(id), listEvents(access.role === "admin" ? undefined : [...roles].filter(([, role]) => role === "administrador_evento").map(([id]) => id))]);
  const versions = await Promise.all(modes.map((m) => modalityVersion(m.version_publicada)));
  return <main className="admin-main"><Link className="back-link" href={`/admin/eventos/${id}`}>← Volver al evento</Link><div className="page-heading"><div><p className="eyebrow">Configuración de inscripción</p><h1>Modalidades y formularios</h1><p>{event.titulo}</p></div></div><EventAdminNav event={event} />
    <div className="form-stack">{modes.map((mode, i) => <details className="panel" key={mode.id}><summary>{mode.nombre} · versión {versions[i].numero} · {mode.habilitada ? "Disponible" : "Cerrada"}</summary><ModalityEditor eventId={id} mode={mode} definition={versions[i].esquema} /></details>)}
      <details className="panel" key={modes.length}><summary>Agregar modalidad</summary><ModalityEditor eventId={id} /></details><CopyModalitiesForm eventId={id} events={events} />
    </div></main>;
}
