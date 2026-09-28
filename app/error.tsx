"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="container section">
      <section className="panel empty-state">
        <p className="eyebrow">No pudimos cargar esta página</p>
        <h1>Intentemos de nuevo</h1>
        <p>Hubo un problema al obtener la información. Volvé a intentar en unos momentos.</p>
        <div className="error-actions">
          <button type="button" className="button button-primary" onClick={retry}>Volver a intentar</button>
          <Link className="button button-secondary" href="/">Ir a la agenda</Link>
        </div>
      </section>
    </main>
  );
}
