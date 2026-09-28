import Image from "next/image";
import Link from "next/link";

export function FacultyBrand({ href, light = false }: { href: string; light?: boolean }) {
  return (
    <Link className={`brand-link faculty-brand${light ? " brand-link-light" : ""}`} href={href}>
      <span className="faculty-logo-frame">
        <Image
          className="faculty-logo"
          src="/images/logo-ftyca-blanco.png"
          alt="Facultad de Tecnología y Ciencias Aplicadas"
          width={48}
          height={56}
          loading="eager"
        />
      </span>
      <span>Eventos <small>Universidad Nacional de Catamarca</small></span>
    </Link>
  );
}
