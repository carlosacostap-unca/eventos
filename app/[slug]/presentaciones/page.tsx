import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/services/events";
import { listModalities } from "@/lib/services/modalities";
import { PresentationDelivery } from "@/components/presentation-delivery";

export const dynamic = "force-dynamic";
export default async function PresentationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.estado !== "publicado" || !(await listModalities(event.id)).some((mode) => mode.codigo === "expositor")) notFound();
  return <main className="container registration-section presentation-delivery"><Link className="back-link" href={`/${slug}`}>← Volver al evento</Link>
    <div className="page-heading"><div><p className="eyebrow">Alumnos expositores</p><h1>Presentaciones finales</h1><p>{event.titulo}</p></div></div>
    <p>Ingresá tu DNI para entregar o reemplazar la presentación de cada trabajo. No necesitás volver a inscribirte.</p><PresentationDelivery eventId={event.id} />
  </main>;
}
