import Link from "next/link";
import { notFound } from "next/navigation";

import { EventTypeForm } from "@/components/event-type-form";
import { getEventTypeById } from "@/lib/services/event-types";

export default async function EditEventTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const type = await getEventTypeById(id);
  if (!type) notFound();

  return (
    <main className="admin-main narrow">
      <Link className="back-link" href="/admin/tipos">← Volver a tipos</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1>{type.nombre}</h1>
        </div>
      </div>
      <EventTypeForm type={type} />
    </main>
  );
}
