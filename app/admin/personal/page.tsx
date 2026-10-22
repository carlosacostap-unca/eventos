import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listStaff } from "@/lib/services/staff";
import { StaffForm } from "@/components/staff-forms";

export default async function StaffPage() {
  await requireAdmin();
  const users = await listStaff();
  return <main className="admin-main narrow">
    <Link className="back-link" href="/admin">← Volver a eventos</Link>
    <div className="page-heading"><div><p className="eyebrow">Administración general</p><h1>Personal</h1><p>Creá cuentas y asignales un rol desde la sección Equipo de cada evento.</p></div></div>
    <StaffForm />
    <section className="panel form-stack"><h2>Cuentas operativas</h2>{users.length ? users.map(u => <div key={u.id}><strong>{String(u.nombre)}</strong><p>{u.email}</p></div>) : <p>Todavía no hay cuentas operativas.</p>}</section>
  </main>;
}
