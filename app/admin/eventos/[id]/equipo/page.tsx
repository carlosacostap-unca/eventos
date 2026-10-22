import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getEventById } from "@/lib/services/events";
import { listAssignments, listStaff } from "@/lib/services/staff";
import { AssignmentForm } from "@/components/staff-forms";
import { EventAdminNav } from "@/components/event-admin-nav";
import { revokeAssignmentAction } from "@/app/actions/staff";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();
  const [assignments, staff] = await Promise.all([listAssignments(id), listStaff()]);
  const users = staff.map(u => ({ id: u.id, nombre: String(u.nombre), email: String(u.email) }));
  return <main className="admin-main">
    <Link className="back-link" href={`/admin/eventos/${id}`}>← Volver al evento</Link>
    <div className="page-heading"><div><p className="eyebrow">Administración general</p><h1>Equipo del evento</h1><p>{event.titulo}</p></div></div>
    <EventAdminNav event={event} />
    <section className="panel form-stack"><h2>Asignar una persona</h2><p>El rol se aplica solo a este evento. Elegir una persona ya asignada actualiza su rol.</p>{users.length ? <AssignmentForm eventId={id} users={users} /> : <p>No hay cuentas operativas disponibles.</p>}<Link href="/admin/personal" className="text-link">Crear una cuenta operativa</Link></section>
    <section className="form-stack"><h2>Personas asignadas</h2>{assignments.length ? assignments.map(a => <article className="panel form-stack" key={a.id}>
      <h3>{String(a.expand?.usuario?.nombre ?? "Cuenta operativa")}</h3>
      <AssignmentForm eventId={id} users={users} current={{ usuario: String(a.usuario), rol: String(a.rol) }} />
      <form action={revokeAssignmentAction.bind(null, id, a.id)}><button className="button button-secondary" type="submit">Quitar acceso a este evento</button></form>
    </article>) : <p>Este evento todavía no tiene personal asignado.</p>}</section>
  </main>;
}
