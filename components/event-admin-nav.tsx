import Link from "next/link";

import type { EventRecord } from "@/lib/domain/models";

export function EventAdminNav({ event }: { event: EventRecord }) {
  const base = "/admin/eventos/" + event.id;
  return (
    <nav className="tabs" aria-label={"Secciones de " + event.titulo}>
      <Link href={base}>Resumen</Link>
      <Link href={base + "/editar"}>Configuración</Link>
      <Link href={base + "/disertantes"}>Disertantes</Link>
      <Link href={base + "/acreditacion"}>Acreditación</Link>
      <Link href={base + "/certificados"}>Certificados</Link>
      <Link href={base + "/reportes"}>Reportes</Link>
    </nav>
  );
}
