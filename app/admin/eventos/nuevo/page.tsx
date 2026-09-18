import Link from "next/link";

import { EventForm } from "@/components/event-form";

export default function NewEventPage() {
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
      <EventForm />
    </main>
  );
}
