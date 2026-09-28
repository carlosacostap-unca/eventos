import { ActiveNavLink } from "@/components/active-nav-link";

import type { EventRecord } from "@/lib/domain/models";

export function EventAdminNav({ event }: { event: EventRecord }) {
  const base = "/admin/eventos/" + event.id;
  return (
    <nav className="tabs" aria-label={"Secciones de " + event.titulo}>
      <ActiveNavLink href={base} exact>Resumen</ActiveNavLink>
      <ActiveNavLink href={base + "/editar"}>Configuración</ActiveNavLink>
      <ActiveNavLink href={base + "/disertantes"}>Disertantes</ActiveNavLink>
      <ActiveNavLink href={base + "/acreditacion"}>Acreditación</ActiveNavLink>
      <ActiveNavLink href={base + "/certificados"}>Certificados</ActiveNavLink>
      <ActiveNavLink href={base + "/reportes"}>Reportes</ActiveNavLink>
    </nav>
  );
}
