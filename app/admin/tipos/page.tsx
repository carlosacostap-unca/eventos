import Link from "next/link";

import { EventTypeForm } from "@/components/event-type-form";
import { listEventTypes } from "@/lib/services/event-types";

export default async function EventTypesPage() {
  const types = await listEventTypes();

  return (
    <main className="admin-main narrow">
      <Link className="back-link" href="/admin">← Volver a eventos</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1>Tipos de eventos</h1>
          <p>Definí las categorías disponibles al crear o editar un evento.</p>
        </div>
      </div>
      <section className="section-heading compact">
        <div><h2>Nuevo tipo</h2></div>
      </section>
      <EventTypeForm />
      <section className="event-types-list" aria-label="Tipos configurados">
        <h2>Tipos configurados</h2>
        {types.length === 0 ? (
          <p>Todavía no hay tipos. Creá el primero para comenzar.</p>
        ) : (
          <div className="admin-event-list">
            {types.map((type) => (
              <Link className="admin-event-row" href={"/admin/tipos/" + type.id + "/editar"} key={type.id}>
                <div>
                  <strong>{type.nombre}</strong>
                  <small>{type.descripcion || "Sin descripción"}</small>
                </div>
                <div className="admin-event-meta">
                  <span className={"badge badge-" + (type.activo ? "publicado" : "borrador")}>
                    {type.activo ? "Activo" : "Inactivo"}
                  </span>
                  <span className="row-arrow">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
