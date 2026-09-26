import Link from "next/link";
import { notFound } from "next/navigation";

import { generateCertificatesAction } from "@/app/actions/certificates";
import { uploadTemplateAction } from "@/app/actions/events";
import { EventAdminNav } from "@/components/event-admin-nav";
import { offersAttendanceCertificate } from "@/lib/domain/event-details";
import { getEventById } from "@/lib/services/events";
import { listCertificateRows } from "@/lib/services/certificates";
import { listRegistrations } from "@/lib/services/registrations";

export default async function CertificatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    reused?: string;
    eligible?: string;
    ok?: string;
    error?: string;
  }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
  const event = await getEventById(id);
  if (!event) notFound();
  const enabled = offersAttendanceCertificate(event);

  const [rows, registrations] = await Promise.all([
    listCertificateRows(id),
    listRegistrations(id),
  ]);
  const accredited = registrations.filter((item) => item.acreditado).length;

  return (
    <main className="admin-main">
      <Link className="back-link" href={"/admin/eventos/" + id}>
        ← Volver al evento
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Cierre del evento</p>
          <h1>Certificados</h1>
          <p>{event.titulo}</p>
        </div>
        {enabled && (
          <a
          className="button button-secondary"
          href={"/api/admin/eventos/" + id + "/certificados/preview"}
          target="_blank"
          rel="noreferrer"
        >
          Vista previa PDF
          </a>
        )}
      </div>
      <EventAdminNav event={event} />

      {!enabled && (
        <div className="notice notice-error" role="status">
          Este evento no entrega certificados de asistencia. Podés cambiarlo en la{" "}
          <Link className="text-link" href={"/admin/eventos/" + id + "/editar"}>configuración</Link>.
        </div>
      )}
      {notice.eligible ? (
        <div className="notice notice-success" role="status">
          Lote procesado: {notice.created || 0} certificados nuevos y{" "}
          {notice.reused || 0} reutilizados para {notice.eligible} asistentes.
        </div>
      ) : null}
      {notice.ok === "plantilla" ? (
        <div className="notice notice-success" role="status">
          La plantilla se guardó correctamente.
        </div>
      ) : null}
      {notice.error ? (
        <div className="notice notice-error" role="alert">
          {notice.error === "deshabilitado"
            ? "Este evento no entrega certificados de asistencia."
            : "No se pudo guardar la plantilla. Usá un PDF, PNG o JPG válido de hasta 10 MB."}
        </div>
      ) : null}

      {enabled && (
        <section className="certificate-setup">
        <article className="panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Diseño</p>
              <h2>Plantilla del certificado</h2>
            </div>
            <span className="badge">
              {event.plantilla_certificado ? "Personalizada" : "Predeterminada"}
            </span>
          </div>
          <p className="muted">
            Podés usar la plantilla institucional incluida o cargar un fondo PDF,
            PNG o JPG. La vista previa nunca crea certificados.
          </p>
          <form
            className="upload-form"
            action={uploadTemplateAction.bind(null, id)}
          >
            <label className="file-field">
              <span>Archivo de plantilla</span>
              <input
                type="file"
                name="plantilla"
                accept="application/pdf,image/png,image/jpeg"
                required
              />
            </label>
            <button className="button button-secondary" type="submit">
              Guardar plantilla
            </button>
          </form>
        </article>

        <article className="panel action-panel">
          <p className="eyebrow">Emisión</p>
          <h2>Generar lote</h2>
          <p>
            Hay <strong>{accredited}</strong> personas acreditadas. Solo ellas
            tendrán certificado disponible en el portal público.
          </p>
          <form action={generateCertificatesAction.bind(null, id)}>
            <button className="button button-primary" type="submit">
              Generar certificados
            </button>
          </form>
          <small>Repetir el lote reutiliza certificados existentes.</small>
        </article>
        </section>
      )}

      <section className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Documentos emitidos</p>
            <h2>Certificados generados</h2>
          </div>
          <div className="inline-stats">
            <span>{rows.length} generados</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Participante</th>
                <th>Generado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ registration, certificate }) => (
                <tr key={certificate.id}>
                  <td>
                    <strong>
                      {registration.apellidos}, {registration.nombres}
                    </strong>
                    <small>{registration.email}</small>
                  </td>
                  <td>{new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(certificate.generado_en))}</td>
                  <td>
                    <div className="row-actions">
                      <a
                        className="text-link"
                        href={"/api/admin/certificados/" + certificate.id}
                      >
                        Descargar
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <div className="empty-inline">
              Todavía no se generaron certificados para este evento.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
