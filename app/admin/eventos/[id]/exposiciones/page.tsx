import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getEventById } from "@/lib/services/events";
import { eventExhibitions } from "@/lib/services/modal-registration";
import { listRegistrations } from "@/lib/services/registrations";
import { modalityVersion, listModalities } from "@/lib/services/modalities";
import { EventAdminNav } from "@/components/event-admin-nav";
import { ConfiguredForm } from "@/components/modal-registration-form";
import { updateExhibitionAction } from "@/app/actions/modalities";

export default async function ExhibitionsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();
  const [groups, people, modes] = await Promise.all([eventExhibitions(id), listRegistrations(id), listModalities(id)]);
  const cards = await Promise.all(groups.exhibitions.map(async (group) => {
    const version = await modalityVersion(group.version);
    const principal = people.find((p) => p.id === group.responsable)!;
    const links = groups.members.filter((m) => m.exposicion === group.id);
    const members = links.filter((m) => m.funcion !== "principal").map((m) => ({ ...people.find((p) => p.id === m.participante)!, respuestas: m.respuestas ?? {}, funcion: m.funcion }));
    const mode = modes.find((m) => m.id === group.modalidad)!;
    return <article className="panel form-stack" key={group.id} id={group.id}><h2>{principal.apellidos}, {principal.nombres}</h2><p>{mode.nombre} · {principal.acreditado ? "Alumno acreditado: certificado habilitado" : "Pendiente de acreditación del alumno"}</p><ul>{links.map((m) => { const p = people.find((p) => p.id === m.participante)!; return <li key={m.id}>{m.etiqueta}: {p.apellidos}, {p.nombres} · DNI {p.documento} · {p.acreditado ? "Acreditado" : "Sin acreditar"}</li>; })}</ul><details><summary>Editar integrantes y respuestas</summary><p className="muted">Para corregir la identidad de una persona ya registrada, usá Editar datos en Acreditación. Cambiar integrantes requiere regenerar el certificado compartido.</p><ConfiguredForm eventId={id} mode={{ id: mode.id, nombre: mode.nombre, orden: mode.orden, entrega: mode.entrega, version: group.version, definition: version.esquema }} operation={"edicion-" + group.id} presencial={false} isFull={false} initial={{ principal: { ...principal, respuestas: principal.respuestas ?? {} }, integrantes: members }} saveAction={updateExhibitionAction.bind(null, id, group.id)} /></details></article>;
  }));
  return <main className="admin-main"><Link className="back-link" href={`/admin/eventos/${id}`}>← Volver al evento</Link><div className="page-heading"><div><h1>Exposiciones</h1><p>{event.titulo}</p></div></div><EventAdminNav event={event} /><div className="form-stack">{cards.length ? cards : <div className="panel">Todavía no hay exposiciones registradas.</div>}</div></main>;
}
