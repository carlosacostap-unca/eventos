"use client";

import { useId, useState } from "react";

type CatalogItem = { id: string; search: string; status: string; content: React.ReactNode };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

export function EventCatalog({ items, admin = false }: { items: CatalogItem[]; admin?: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const id = useId();
  const visible = items.filter(item => normalize(item.search).includes(normalize(query.trim())) && (!status || item.status === status));
  return (
    <div>
      <div className="catalog-toolbar">
        <label className="field" htmlFor={id}>
          <span>Buscar eventos</span>
          <input id={id} type="search" placeholder="Nombre, lugar o tipo de evento" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <label className="field">
          <span>{admin ? "Estado del evento" : "Inscripción"}</span>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos los eventos</option>
            {admin ? <><option value="borrador">Borradores</option><option value="publicado">Publicados</option><option value="finalizado">Finalizados</option></> : <><option value="disponible">Inscripción abierta</option><option value="completo">Cupo completo</option><option value="cerrado">Inscripción cerrada</option><option value="finalizado">Finalizados</option></>}
          </select>
        </label>
      </div>
      <div className="catalog-summary">
        <p role="status">{visible.length} {visible.length === 1 ? "evento" : "eventos"}{query || status ? ` de ${items.length}` : " en la agenda"}</p>
        {(query || status) && <button type="button" className="text-button" onClick={() => { setQuery(""); setStatus(""); }}>Limpiar filtros</button>}
      </div>
      <div className={admin ? "admin-event-list" : "event-grid"}>
        {visible.map(item => <div key={item.id}>{item.content}</div>)}
      </div>
      {visible.length === 0 && <div className="empty-state panel"><h2>No encontramos coincidencias</h2><p>Probá con otro nombre o quitá los filtros para ver todos los eventos.</p><button className="button button-secondary" type="button" onClick={() => { setQuery(""); setStatus(""); }}>Ver todos los eventos</button></div>}
    </div>
  );
}
