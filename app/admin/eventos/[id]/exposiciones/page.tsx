import { requireEventAccess } from "@/lib/auth/event-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/services/events";
import { eventExhibitions } from "@/lib/services/modal-registration";
import { listRegistrations } from "@/lib/services/registrations";
import { modalityVersion, listModalities } from "@/lib/services/modalities";
import { EventAdminNav } from "@/components/event-admin-nav";
import { ConfiguredForm } from "@/components/modal-registration-form";
import { updateExhibitionAction } from "@/app/actions/modalities";
import { exhibitionTitle } from "@/lib/domain/modalities";
import { presentationInfo } from "@/lib/domain/presentations";
import { materialSize } from "@/lib/domain/materials";

export default async function ExhibitionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEventAccess(id);
  const event = await getEventById(id);
  if (!event) notFound();
  const [groups, people, modes] = await Promise.all([eventExhibitions(id), listRegistrations(id), listModalities(id)]);
  const cards = await Promise.all(groups.exhibitions.map(async (group) => {
    const version = await modalityVersion(group.version);
    const principal = people.find((p) => p.id === group.responsable)!;
    const links = groups.members.filter((m) => m.exposicion === group.id);
    const members = links.filter((m) => m.funcion !== "principal").map((m) => ({ ...people.find((p) => p.id === m.participante)!, respuestas: m.respuestas ?? {}, funcion: m.funcion }));
    const mode = modes.find((m) => m.id === group.modalidad)!;
    const presentation = presentationInfo(group);
    const filePath = `/api/admin/exposiciones/${group.id}/presentacion`;
    return <article className="panel form-stack" key={group.id} id={group.id}>
      <h2>{exhibitionTitle(version.esquema, group.respuestas)}</h2><p>{principal.apellidos}, {principal.nombres}</p><p>{mode.nombre} · {principal.acreditado ? "Alumno acreditado: certificado habilitado" : "Pendiente de acreditación del alumno"}</p>
      <section className="presentation-admin form-stack" aria-label="Presentación final"><h3>Presentación final</h3>
        {presentation ? <><p><strong>{presentation.filename}</strong> · {materialSize(presentation.size)} · {presentation.format.toUpperCase()}</p>
          {presentation.uploadedAt && <small className="muted">Última entrega: {new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(presentation.uploadedAt))}</small>}
          <div className="actions-row"><a className="button button-secondary" href={filePath}>Descargar presentación</a>{presentation.format === "pdf" && <a className="button button-secondary" href={filePath + "?ver=1"} target="_blank" rel="noreferrer">Abrir PDF</a>}</div>
          {presentation.format === "pdf" ? <details><summary>Ver PDF en esta pantalla</summary><iframe className="presentation-preview" src={filePath + "?ver=1"} title={"Presentación de " + exhibitionTitle(version.esquema, group.respuestas)} loading="lazy" /></details> : <p className="muted">Descargá el PowerPoint para visualizarlo con tu aplicación habitual. La vista previa integrada está disponible para PDF.</p>}
        </> : <p className="muted">Pendiente de entrega. El alumno todavía no adjuntó una presentación final.</p>}
      </section>
      <ul>{links.map((m) => { const p = people.find((p) => p.id === m.participante)!; return <li key={m.id}>{m.etiqueta}: {p.apellidos}, {p.nombres} · DNI {p.documento} · {p.acreditado ? "Acreditado" : "Sin acreditar"}</li>; })}</ul>
      <details><summary>Editar integrantes y respuestas</summary><p className="muted">Para corregir la identidad de una persona ya registrada, usá Editar datos en Acreditación. Cambiar integrantes requiere regenerar el certificado compartido.</p><ConfiguredForm eventId={id} mode={{ id: mode.id, nombre: mode.nombre, orden: mode.orden, entrega: mode.entrega, version: group.version, definition: version.esquema }} operation={"edicion-" + group.id} presencial={false} isFull={false} initial={{ principal: { ...principal, respuestas: group.respuestas ?? {} }, integrantes: members }} saveAction={updateExhibitionAction.bind(null, id, group.id)} /></details>
    </article>;
  }));
  return <main className="admin-main"><Link className="back-link" href={`/admin/eventos/${id}`}>← Volver al evento</Link><div className="page-heading"><div><h1>Exposiciones</h1><p>{event.titulo}</p></div></div><EventAdminNav event={event} /><div className="form-stack">{cards.length ? cards : <div className="panel">Todavía no hay exposiciones registradas.</div>}</div></main>;
}
