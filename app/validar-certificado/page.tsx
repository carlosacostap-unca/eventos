import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CertificateVerificationForm } from "@/components/certificate-verification-form";

export const metadata: Metadata = { title: "Validar certificado", description: "Verificá los datos de un certificado emitido por la Facultad.", robots: { index: false, follow: false } };

export default function VerifyCertificatePage() {
  return <main className="certificate-lookup-page">
    <header className="certificate-lookup-hero"><div className="container">
      <Link className="public-event-logo-link" href="/" aria-label="Volver a eventos"><Image className="public-event-logo" src="/images/logo-ftyca-blanco.png" alt="Facultad de Tecnología y Ciencias Aplicadas" width={80} height={94} priority /></Link>
      <nav className="public-page-nav" aria-label="Navegación"><Link href="/">← Volver a la agenda</Link><Link href="/mis-certificados">Mis certificados</Link></nav>
      <div className="certificate-lookup-copy"><p className="eyebrow">Facultad de Tecnología y Ciencias Aplicadas</p><h1>Validar un certificado</h1><p>Consultá el registro de emisión con el código que aparece en el certificado.</p></div>
    </div></header>
    <section className="container certificate-lookup-content"><CertificateVerificationForm /></section>
  </main>;
}
