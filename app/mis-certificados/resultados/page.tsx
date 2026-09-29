import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CERTIFICATE_ACCESS_COOKIE, unsealParticipantAccess } from "@/lib/certificates/public-access";
import { getServerEnv } from "@/lib/env";
import { getParticipantResources } from "@/lib/services/participant-resources";
import { materialSize } from "@/lib/domain/materials";

export default async function CertificateResultsPage() {
  const token = (await cookies()).get(CERTIFICATE_ACCESS_COOKIE)?.value;
  if (!token) redirect("/mis-certificados");
  const access = await unsealParticipantAccess(token, getServerEnv().SESSION_SECRET);
  if (!access) redirect("/mis-certificados");
  const results = await getParticipantResources(access);
  if (!results) redirect("/mis-certificados");

  const dateFormat = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <section className="panel certificate-results" aria-labelledby="certificate-participant">
      <div>
        <p className="eyebrow">Apellidos, Nombres</p>
        <h2 id="certificate-participant">
          {results.participant.apellidos}, {results.participant.nombres}
        </h2>
        <p className="muted">Descargá los materiales y certificados de los eventos donde acreditaste tu asistencia.</p>
      </div>
      <div className="certificate-result-list">
        {results.events.map((event) => (
          <article className="certificate-result" key={event.eventId}>
            <div>
              <h3>{event.title}</h3>
              <p>{dateFormat.format(new Date(event.date))}</p>
            </div>
            {event.certificateId ? <a className="button button-primary" href={`/api/certificados/${event.certificateId}`} target="_blank" rel="noreferrer">
              Descargar certificado
            </a> : <p className="muted">{event.offersCertificate ? "El certificado todavía no fue emitido." : "Este evento no entrega certificado."}</p>}
            <div className="event-materials">
              <h4>Materiales de la charla</h4>
              {event.materials.length ? <ul className="material-list">{event.materials.map((material) => <li key={material.id}>
                <div><strong>{material.titulo}</strong><p className="muted">{material.nombre_original} · {materialSize(material.tamano)}</p></div>
                <a className="button button-secondary" href={`/api/materiales/${material.id}`}>Descargar material</a>
              </li>)}</ul> : <p className="muted">Todavía no hay materiales disponibles.</p>}
            </div>
          </article>
        ))}
      </div>
      <div>
        <Link className="button button-secondary" href="/mis-certificados">Consultar otro documento</Link>
      </div>
    </section>
  );
}
