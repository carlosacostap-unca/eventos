import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container section">
      <section className="panel empty-state">
        <p className="eyebrow">404</p>
        <h1>No encontramos esa página</h1>
        <p>El evento puede no existir o ya no estar publicado.</p>
        <Link className="button button-primary" href="/">
          Ver eventos
        </Link>
      </section>
    </main>
  );
}
