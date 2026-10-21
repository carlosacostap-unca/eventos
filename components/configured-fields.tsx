"use client";
import type { Answers, ExtraField } from "@/lib/domain/modalities";
import { FieldError } from "./form-feedback";

export function ConfiguredFields({ fields, values, onChange, prefix = "respuestas", errors = {} }: { fields: ExtraField[]; values: Answers; onChange: (values: Answers) => void; prefix?: string; errors?: Record<string, string[] | undefined> }) {
  return <>{fields.map((field, index) => {
    const value = values[field.id];
    const change = (next: Answers[string]) => onChange({ ...values, [field.id]: next });
    const shared = { required: field.required, name: prefix + "." + field.id };
    return <div className="field" key={field.id}>
      {field.section && (index === 0 || fields[index - 1].section !== field.section) && <h3>{field.section}</h3>}
      <label className="field"><span>{field.label}{field.required ? " *" : " (opcional)"}</span>
        {field.type === "textarea" ? <textarea {...shared} value={String(value ?? "")} maxLength={5000} onChange={(e) => change(e.target.value)} />
          : field.type === "select" || field.type === "multiselect" ? <select {...shared} multiple={field.type === "multiselect"} value={field.type === "multiselect" ? (Array.isArray(value) ? value : []) : String(value ?? "")} onChange={(e) => change(field.type === "multiselect" ? Array.from(e.target.selectedOptions, (o) => o.value) : e.target.value)}>
            {field.type === "select" && <option value="">Seleccioná una opción</option>}{field.options.map((o) => <option key={o}>{o}</option>)}
          </select> : field.type === "checkbox" ? <input {...shared} type="checkbox" checked={value === true} onChange={(e) => change(e.target.checked)} />
            : <input {...shared} type={field.type} min={field.min} max={field.max} maxLength={field.type === "tel" ? 40 : 500} value={String(value ?? "")} onChange={(e) => change(e.target.value)} />}
        {field.help && <small>{field.help}</small>}
      </label>
      <FieldError errors={errors[prefix + "." + field.id]} />
    </div>;
  })}</>;
}
