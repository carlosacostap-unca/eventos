import { ActiveNavLink } from "@/components/active-nav-link";

import type { EventRecord } from "@/lib/domain/models";
import { getEventAccess } from "@/lib/auth/event-access";

export async function EventAdminNav({ event }: { event: EventRecord }) {
  const base = "/admin/eventos/" + event.id;
  const access = await getEventAccess(event.id, "accredit");
  if (!access) return null;
  if (access.eventRole === "acreditador") return <nav className="tabs" aria-label={"Secciones de " + event.titulo}><ActiveNavLink href="/admin" exact>Mis eventos</ActiveNavLink><ActiveNavLink href={base + "/acreditacion"}>Acreditación</ActiveNavLink></nav>;
  return (
    <nav className="tabs" aria-label={"Secciones de " + event.titulo}>
      <ActiveNavLink href={base} exact>Resumen</ActiveNavLink>
      <ActiveNavLink href={base + "/inscritos"}>Inscritos</ActiveNavLink>
      <ActiveNavLink href={base + "/editar"}>Configuración</ActiveNavLink>
      <ActiveNavLink href={base + "/modalidades"}>Modalidades y formularios</ActiveNavLink>
      <ActiveNavLink href={base + "/disertantes"}>Disertantes</ActiveNavLink>
      <ActiveNavLink href={base + "/acreditacion"}>Acreditación</ActiveNavLink>
      <ActiveNavLink href={base + "/exposiciones"}>Exposiciones</ActiveNavLink>
      <ActiveNavLink href={base + "/certificados"}>Certificados</ActiveNavLink>
      <ActiveNavLink href={base + "/materiales"}>Materiales</ActiveNavLink>
      <ActiveNavLink href={base + "/reportes"}>Reportes</ActiveNavLink>
      {access.role === "admin" && <ActiveNavLink href={base + "/equipo"}>Equipo</ActiveNavLink>}
    </nav>
  );
}
