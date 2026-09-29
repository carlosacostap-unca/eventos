"use client";

import { useActionState, useState } from "react";
import { uploadMaterialAction, deleteMaterialAction } from "@/app/actions/materials";
import { initialActionState } from "@/app/actions/state";
import { FormMessage } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { MATERIAL_ACCEPT, materialFileError } from "@/lib/domain/materials";

export function MaterialUploadForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(uploadMaterialAction.bind(null, eventId), initialActionState);
  const [error, setError] = useState<string | null>(null);
  return <form action={action} className="panel form-stack">
    <h2>Adjuntar material</h2>
    <p className="muted">Imágenes, PDF, PowerPoint y documentos de Office/OpenDocument. Máximo 25 MB por archivo. Podés adjuntar varios materiales, uno por vez.</p>
    <FormMessage message={error || state.message} success={!error && state.ok} />
    <label className="field"><span>Título (opcional)</span><input name="titulo" maxLength={160} placeholder="Por ejemplo: Diapositivas de la charla" /></label>
    <label className="file-field"><span>Archivo</span><input name="archivo" type="file" accept={MATERIAL_ACCEPT} required
      onChange={(event) => setError(event.target.files?.[0] ? materialFileError(event.target.files[0]) : null)} /></label>
    <button type="submit" className="button button-primary" disabled={pending || !!error} aria-busy={pending}>{pending ? "Subiendo material…" : "Subir material"}</button>
  </form>;
}

export function MaterialDeleteForm({ eventId, materialId }: { eventId: string; materialId: string }) {
  const [state, action] = useActionState(deleteMaterialAction.bind(null, eventId, materialId), initialActionState);
  return <form action={action} onSubmit={(event) => { if (!window.confirm("¿Eliminar este material? Dejará de estar disponible para los asistentes.")) event.preventDefault(); }}>
    <SubmitButton className="button button-secondary" pendingLabel="Eliminando…">Eliminar</SubmitButton>
    <FormMessage message={state.message} />
  </form>;
}
