export default function Loading() {
  return (
    <main className="admin-main" aria-busy="true" aria-live="polite">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-tabs" />
      <div className="metric-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton skeleton-card" key={index} />
        ))}
      </div>
    </main>
  );
}
