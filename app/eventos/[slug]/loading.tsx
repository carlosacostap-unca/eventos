export default function Loading() {
  return (
    <main className="public-event" aria-busy="true" aria-live="polite">
      <section className="event-hero">
        <div className="container event-hero-copy">
          <div className="skeleton skeleton-light skeleton-title" />
          <div className="skeleton skeleton-light skeleton-copy" />
        </div>
      </section>
    </main>
  );
}
