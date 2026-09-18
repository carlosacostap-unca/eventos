import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="brand-link brand-link-light" href="/admin">
          <span className="brand-mark">UNCA</span>
          <span>Eventos</span>
        </Link>
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
      <div className="admin-body">{children}</div>
    </div>
  );
}
