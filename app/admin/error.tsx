"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-main narrow">
      <section className="panel empty-state">
        <p className="eyebrow">No pudimos completar la operación</p>
        <h1>Ocurrió un problema</h1>
        <p>Los datos sensibles se mantuvieron protegidos. Podés volver a intentar.</p>
        <button className="button button-primary" type="button" onClick={reset}>
          Intentar nuevamente
        </button>
      </section>
    </main>
  );
}
