import Link from "next/link";

import { EventForm } from "@/components/event-form";
import { listEventTypes } from "@/lib/services/event-types";

export default async function NewEventPage() {
  const types = await listEventTypes();
  return (
    <main className="admin-main narrow">
      <Link className="back-link" href="/admin">
        ← Volver a eventos
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Nuevo evento</p>
          <h1>Configuración inicial</h1>
        </div>
      </div>
      <EventForm types={types} />
    </main>
  );
}
