import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { getAuthenticatedAdmin } from "@/lib/auth/session";
import { ActiveNavLink } from "@/components/active-nav-link";
import { FacultyBrand } from "@/components/faculty-brand";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAuthenticatedAdmin();
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
          <ActiveNavLink href="/admin/tipos">Tipos de eventos</ActiveNavLink>
          <Link href="/">Ver agenda pública <span aria-hidden="true">↗</span></Link>
        </div>
      </nav>
      <div className="admin-body">{children}</div>
    </div>
  );
}
