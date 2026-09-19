import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Acceso administrativo" };

export default async function LoginPage() {
  const session = await getSession();
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Link className="brand-link" href="/">
          <span className="brand-mark">UNCA</span>
          <span>Eventos</span>
        </Link>
        <div className="auth-copy">
          <p className="eyebrow">Panel administrativo</p>
          <h1>{session ? "Tu sesión está activa" : "Bienvenido de nuevo"}</h1>
          <p>
            Gestioná eventos, acreditaciones, certificados y estadísticas desde un
            solo lugar.
          </p>
        </div>
        {session ? (
          <Link className="button button-primary" href="/admin">
            Continuar al panel
          </Link>
        ) : (
          <LoginForm />
        )}
      </section>
      <aside className="auth-art" aria-hidden="true">
        <div className="auth-step">
          <span className="auth-art-number">01</span>
          <span>Organizar</span>
        </div>
        <div className="auth-step">
          <span className="auth-art-number">02</span>
          <span>Acreditar</span>
        </div>
        <div className="auth-step">
          <span className="auth-art-number">03</span>
          <span>Reconocer</span>
        </div>
      </aside>
    </main>
  );
}
