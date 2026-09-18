import Link from "next/link";
import { notFound } from "next/navigation";

import {
  generateCertificatesAction,
  requeueDeliveryAction,
} from "@/app/actions/certificates";
import { uploadTemplateAction } from "@/app/actions/events";
import { EventAdminNav } from "@/components/event-admin-nav";
import { getEventById } from "@/lib/services/events";
import { listCertificateRows } from "@/lib/services/certificates";
import { listRegistrations } from "@/lib/services/registrations";

const statusLabels = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  fallido: "Fallido",
} as const;

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

  const [rows, registrations] = await Promise.all([
    listCertificateRows(id),
    listRegistrations(id),
  ]);
  const accredited = registrations.filter((item) => item.acreditado).length;
  const sent = rows.filter((row) => row.delivery.estado === "enviado").length;
  const failed = rows.filter((row) => row.delivery.estado === "fallido").length;

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
        <a
          className="button button-secondary"
          href={"/api/admin/eventos/" + id + "/certificados/preview"}
          target="_blank"
          rel="noreferrer"
        >
          Vista previa PDF
        </a>
      </div>
      <EventAdminNav event={event} />

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
          No se pudo guardar la plantilla. Usá un PDF, PNG o JPG válido de hasta
          10 MB.
        </div>
      ) : null}

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
            PNG o JPG. La vista previa nunca crea certificados ni envíos.
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
            recibirán certificado.
          </p>
          <form action={generateCertificatesAction.bind(null, id)}>
            <button className="button button-primary" type="submit">
              Generar y encolar certificados
            </button>
          </form>
          <small>Repetir el lote reutiliza certificados existentes.</small>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Cola de correo</p>
            <h2>Estado de los envíos</h2>
          </div>
          <div className="inline-stats">
            <span>{rows.length} generados</span>
            <span>{sent} enviados</span>
            <span>{failed} fallidos</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Participante</th>
                <th>Estado</th>
                <th>Intentos</th>
                <th>Último detalle</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ delivery, registration, certificate }) => (
                <tr key={delivery.id}>
                  <td>
                    <strong>
                      {registration.apellidos}, {registration.nombres}
                    </strong>
                    <small>{registration.email}</small>
                  </td>
                  <td>
                    <span className={"status-dot status-" + delivery.estado}>
                      {statusLabels[delivery.estado]}
                    </span>
                  </td>
                  <td>{delivery.intentos}</td>
                  <td className="error-cell">
                    {delivery.error ||
                      (delivery.enviado_en
                        ? new Intl.DateTimeFormat("es-AR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(delivery.enviado_en))
                        : "A la espera del procesador")}
                  </td>
                  <td>
                    <div className="row-actions">
                      <a
                        className="text-link"
                        href={"/api/admin/certificados/" + certificate.id}
                      >
                        Descargar
                      </a>
                      {delivery.estado !== "pendiente" ? (
                        <form action={requeueDeliveryAction}>
                          <input type="hidden" name="deliveryId" value={delivery.id} />
                          <input type="hidden" name="eventId" value={event.id} />
                          <button className="text-button" type="submit">
                            Reenviar
                          </button>
                        </form>
                      ) : null}
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
