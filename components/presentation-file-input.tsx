"use client";
import { PRESENTATION_ACCEPT, presentationFileError, type PresentationInfo } from "@/lib/domain/presentations";
import { materialSize } from "@/lib/domain/materials";
import { FieldError } from "./form-feedback";

export function PresentationFileInput({ file, onChange, current, error }: { file: File | null; onChange: (file: File | null, error: string | null) => void; current?: PresentationInfo; error?: string }) {
  return <section className="form-stack presentation-upload" aria-label="Presentación final del trabajo">
    <div><h3>Presentación final</h3><p className="muted">PDF o PowerPoint (.ppt, .pptx), hasta 25 MB. Podés entregarla ahora o volver después por DNI.</p></div>
    {current && <p className="notice notice-success">Archivo guardado: <strong>{current.filename}</strong> · {materialSize(current.size)}. Si elegís otro archivo, reemplazará esta versión.</p>}
    <label className="file-field"><span>{current ? "Reemplazar presentación (opcional)" : "Adjuntar presentación (opcional)"}</span><input type="file" accept={PRESENTATION_ACCEPT} onChange={(event) => {
      const selected = event.target.files?.[0] ?? null;
      const problem = selected ? presentationFileError(selected) : null;
      onChange(problem ? null : selected, problem);
      if (problem) event.target.value = "";
    }} /></label>
    {file && <p role="status">Archivo seleccionado: <strong>{file.name}</strong> · {materialSize(file.size)}</p>}
    <FieldError errors={error ? [error] : undefined} />
  </section>;
}
