"use client";

export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="admin-main narrow">
      <section className="panel empty-state">
        <p className="eyebrow">No pudimos completar la operación</p>
        <h1>Ocurrió un problema</h1>
        <p>No pudimos cargar la información. Volvé a intentar en unos momentos.</p>
        <button className="button button-primary" type="button" onClick={retry}>
          Intentar nuevamente
        </button>
      </section>
    </main>
  );
}
