import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { getAuthenticatedStaff } from "@/lib/auth/session";
import { ActiveNavLink } from "@/components/active-nav-link";
import { FacultyBrand } from "@/components/faculty-brand";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAuthenticatedStaff();
  if (!admin) return children;
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <FacultyBrand href="/admin" light />
        <div className="admin-user">
          <span>
            <small>Sesión iniciada</small>
            {admin.name}
          </span>
          <form action={logoutAction}>
            <button className="button button-ghost-light" type="submit">
              Salir
            </button>
          </form>
        </div>
      </header>
      <nav className="admin-global-nav" aria-label="Administración">
        <div className="container">
          <ActiveNavLink href="/admin" exact>Mis eventos</ActiveNavLink>
          {admin.role === "admin" && <>
            <ActiveNavLink href="/admin/tipos">Tipos de eventos</ActiveNavLink>
            <ActiveNavLink href="/admin/personal">Personal</ActiveNavLink>
            {/* El visor es un documento HTML servido por un Route Handler; requiere navegación completa. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/admin/documentacion/procesos">Procesos BPMN</a>
          </>}
          <Link href="/">Ver agenda pública <span aria-hidden="true">↗</span></Link>
        </div>
      </nav>
      <div className="admin-body">{children}</div>
    </div>
  );
}
