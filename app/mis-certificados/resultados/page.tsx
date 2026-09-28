import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CERTIFICATE_ACCESS_COOKIE, unsealCertificateAccess } from "@/lib/certificates/public-access";
import { getServerEnv } from "@/lib/env";
import { getPublicCertificateResults } from "@/lib/services/certificate-lookup";

export default async function CertificateResultsPage() {
  const token = (await cookies()).get(CERTIFICATE_ACCESS_COOKIE)?.value;
  if (!token) redirect("/mis-certificados");
  const ids = await unsealCertificateAccess(token, getServerEnv().SESSION_SECRET);
  if (!ids?.length) redirect("/mis-certificados");
  const results = await getPublicCertificateResults(ids);
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
        <p className="muted">Estos son tus certificados disponibles para descargar.</p>
      </div>
      <div className="certificate-result-list">
        {results.certificates.map((certificate) => (
          <article className="certificate-result" key={certificate.id}>
            <div>
              <h3>{certificate.eventTitle}</h3>
              <p>{dateFormat.format(new Date(certificate.eventDate))}</p>
            </div>
            <a className="button button-primary" href={`/api/certificados/${certificate.id}`} target="_blank" rel="noreferrer">
              Descargar PDF
            </a>
          </article>
        ))}
      </div>
      <div>
        <Link className="button button-secondary" href="/mis-certificados">Consultar otro documento</Link>
      </div>
    </section>
  );
}
