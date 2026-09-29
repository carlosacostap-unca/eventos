import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { EventAdminNav } from "@/components/event-admin-nav";
import { MaterialUploadForm, MaterialDeleteForm } from "@/components/material-forms";
import { materialSize } from "@/lib/domain/materials";
import { getEventById } from "@/lib/services/events";
import { listMaterials } from "@/lib/services/materials";

export default async function MaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();
  const materials = await listMaterials(id);
  return <main className="admin-main">
    <Link className="back-link" href={`/admin/eventos/${id}`}>← Volver al evento</Link>
    <div className="page-heading"><div><p className="eyebrow">Recursos para asistentes</p><h1>Materiales</h1><p>{event.titulo}</p></div></div>
    <EventAdminNav event={event} />
    <div className="materials-admin-layout">
    <MaterialUploadForm eventId={id} />
    <section className="panel">
      <h2>Materiales adjuntos</h2>
      <p className="muted">Los asistentes acreditados pueden descargarlos en Mis certificados, junto con el certificado cuando esté disponible.</p>
      {materials.length ? <ul className="material-list">{materials.map((material) => <li key={material.id}>
        <div><strong>{material.titulo}</strong><p className="muted">{material.nombre_original} · {materialSize(material.tamano)}</p></div>
        <div className="row-actions"><a className="button button-secondary" href={`/api/admin/materiales/${material.id}`}>Descargar</a><MaterialDeleteForm eventId={id} materialId={material.id} /></div>
      </li>)}</ul> : <p className="empty-inline">Todavía no se adjuntaron materiales.</p>}
    </section>
    </div>
  </main>;
}
