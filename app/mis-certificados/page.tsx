import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CertificateLookupForm } from "@/components/certificate-lookup-form";

export const metadata: Metadata = {
  title: "Mis certificados",
  description: "Consulta y descarga tus certificados de asistencia.",
  robots: { index: false, follow: false },
};

export default function MyCertificatesPage() {
  return (
    <main className="certificate-lookup-page">
      <header className="certificate-lookup-hero">
        <div className="container">
          <Link className="public-event-logo-link" href="/" aria-label="Volver a eventos">
            <Image
              className="public-event-logo"
              src="/images/logo-ftyca-blanco.png"
              alt="Facultad de Tecnología y Ciencias Aplicadas"
              width={80}
              height={94}
              priority
            />
          </Link>
          <nav className="public-page-nav" aria-label="Navegación"><Link href="/">← Volver a la agenda</Link></nav>
          <div className="certificate-lookup-copy">
            <p className="eyebrow">Facultad de Tecnología y Ciencias Aplicadas</p>
            <h1>Mis certificados</h1>
            <p>Encontrá en un solo lugar los certificados emitidos para tus eventos.</p>
          </div>
        </div>
      </header>
      <section className="container certificate-lookup-content">
        <CertificateLookupForm />
      </section>
    </main>
  );
}
