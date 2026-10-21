import { z } from "zod";
import { normalizeDocument, registrationInputSchema, type RegistrationInput } from "./models";
import type { CertificateTextSections } from "./certificate-texts";

const identifier = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
const label = z.string().trim().min(1).max(160).refine((s) => !/[<>]/.test(s), "Usá texto sin HTML");
export const fieldTypes = ["text", "textarea", "number", "date", "email", "tel", "select", "multiselect", "checkbox"] as const;
export const fieldSchema = z.object({
  id: identifier, label, type: z.enum(fieldTypes), required: z.boolean(),
  help: z.string().max(500).default(""), section: z.string().max(100).default(""),
  options: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  min: z.number().finite().optional(), max: z.number().finite().optional(),
}).strict().superRefine((f, ctx) => {
  if (["nombres", "apellidos", "documento", "email"].includes(f.id)) ctx.addIssue({ code: "custom", message: "Identificador de identidad reservado" });
  if ((f.type === "select" || f.type === "multiselect") && (!f.options.length || new Set(f.options).size !== f.options.length)) ctx.addIssue({ code: "custom", message: "Definí opciones diferentes" });
  if (f.min !== undefined && f.max !== undefined && f.min > f.max) ctx.addIssue({ code: "custom", message: "El mínimo supera al máximo" });
});
export const roleSchema = z.object({ id: identifier, label, min: z.number().int().min(0).max(10), max: z.number().int().min(1).max(10), fields: z.array(fieldSchema).max(30) }).strict();
export const formSchema = z.object({
  fields: z.array(fieldSchema).max(50), roles: z.array(roleSchema).max(5),
  principal: label,
  certificate: z.enum(["individual", "grupo"]),
}).strict().superRefine((s, ctx) => {
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  if (!unique(s.fields.map((f) => f.id)) || !unique(s.roles.map((r) => r.id))) ctx.addIssue({ code: "custom", message: "Hay identificadores repetidos" });
  if (s.roles.some((r) => r.id === "principal")) ctx.addIssue({ code: "custom", message: "La función principal está reservada a la persona responsable" });
  if (s.certificate === "grupo" && !s.roles.length) ctx.addIssue({ code: "custom", message: "Un certificado grupal necesita integrantes" });
  if (s.roles.reduce((total, r) => total + r.max, 0) > 20) ctx.addIssue({ code: "custom", message: "El formulario admite hasta 20 integrantes vinculados" });
  if (new TextEncoder().encode(JSON.stringify(s)).length > 90000) ctx.addIssue({ code: "custom", message: "La configuración supera el tamaño permitido. Reducí campos u opciones." });
  for (const r of s.roles) if (r.min > r.max || !unique(r.fields.map((f) => f.id))) ctx.addIssue({ code: "custom", message: "Revisá los límites o campos del grupo " + r.label });
});
export type FormDefinition = z.infer<typeof formSchema>;
export type ExtraField = z.infer<typeof fieldSchema>;
export type Answers = Record<string, string | number | boolean | string[]>;
export type Modality = { id: string; evento: string; codigo: string; nombre: string; orden: number; habilitada: boolean; version_publicada: string; entrega: boolean; plantilla_certificado?: string; textos_certificado?: Partial<CertificateTextSections>; legacy?: boolean; };
export type FormVersion = { id: string; modalidad: string; numero: number; esquema: FormDefinition };
export type PublicModality = { id: string; nombre: string; orden: number; version: string; definition: FormDefinition; entrega: boolean };
export type Exhibition = { id: string; evento: string; modalidad: string; version: string; responsable: string; respuestas?: Answers };
export type ExhibitionMember = { id: string; exposicion: string; participante: string; funcion: string; etiqueta: string; orden: number; respuestas?: Answers };
export type PersonSubmission = RegistrationInput & { respuestas: Answers };
export type GroupSubmission = { modalidad: string; version: string; operacion: string; principal: PersonSubmission; integrantes: Array<PersonSubmission & { funcion: string }> };
export const attendeeDefinition: FormDefinition = { fields: [], roles: [], principal: "Participante", certificate: "individual" };
export const exhibitorDefinition: FormDefinition = { fields: [], principal: "Alumno expositor", certificate: "grupo", roles: [
  { id: "director", label: "Director", min: 1, max: 1, fields: [] },
  { id: "codirector", label: "Codirector", min: 0, max: 1, fields: [] },
] };

export class FormValidationError extends Error {
  constructor(public fields: Record<string, string[]>) { super("Revisá los datos ingresados."); }
}
export function parseAnswers(fields: ExtraField[], raw: unknown, prefix = "respuestas"): Answers {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const errors: Record<string, string[]> = {};
  const result: Answers = {};
  for (const key of Object.keys(source)) if (!fields.some((f) => f.id === key)) errors[prefix + "." + key] = ["Campo no definido"];
  for (const field of fields) {
    const value = source[field.id];
    const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length);
    const key = prefix + "." + field.id;
    if (empty) { if (field.required) errors[key] = ["Este campo es obligatorio"]; continue; }
    let validator: z.ZodType = z.string().trim().max(field.type === "textarea" ? 5000 : 500).refine((v) => !field.required || v.length > 0);
    if (field.type === "number") validator = z.coerce.number().finite().min(field.min ?? -1e12).max(field.max ?? 1e12);
    if (field.type === "email") validator = z.string().trim().toLowerCase().email().max(254);
    if (field.type === "date") validator = z.iso.date();
    if (field.type === "tel") validator = z.string().trim().regex(/^[+\d ()-]{5,40}$/);
    if (field.type === "select") validator = z.string().refine((v) => field.options.includes(v));
    if (field.type === "multiselect") validator = z.array(z.string().refine((v) => field.options.includes(v))).max(field.options.length).refine((v) => new Set(v).size === v.length);
    if (field.type === "checkbox") validator = field.required ? z.literal(true) : z.boolean();
    const parsed = validator.safeParse(value);
    if (!parsed.success) errors[key] = ["Revisá " + field.label]; else result[field.id] = parsed.data as Answers[string];
  }
  if (Object.keys(errors).length) throw new FormValidationError(errors);
  if (new TextEncoder().encode(JSON.stringify(result)).length > 90000) throw new FormValidationError({ [prefix]: ["Las respuestas superan el tamaño permitido."] });
  return result;
}
export function parseSubmission(definition: FormDefinition, raw: unknown): GroupSubmission {
  const base = z.object({ modalidad: z.string().min(1), version: z.string().min(1), operacion: z.string().regex(/^[a-zA-Z0-9-]{15,80}$/), principal: z.unknown(), integrantes: z.array(z.unknown()).max(50) }).strict().safeParse(raw);
  if (!base.success) throw new FormValidationError({ formulario: ["El formulario no es válido. Actualizá la página."] });
  const errors: Record<string, string[]> = {};
  function person(value: unknown, fields: ExtraField[], prefix: string): PersonSubmission {
    const source = value as Record<string, unknown> | null;
    const parsed = registrationInputSchema.safeParse(source);
    if (!parsed.success) for (const issue of parsed.error.issues) errors[prefix + "." + issue.path.join(".")] = [issue.message];
    let respuestas: Answers = {};
    try { respuestas = parseAnswers(fields, source?.respuestas, prefix + ".respuestas"); } catch (e) { if (e instanceof FormValidationError) Object.assign(errors, e.fields); else throw e; }
    if (source) for (const k of Object.keys(source)) if (!["nombres", "apellidos", "documento", "email", "respuestas", "funcion"].includes(k)) errors[prefix + "." + k] = ["Campo no definido"];
    return { ...(parsed.success ? parsed.data : { nombres: "", apellidos: "", documento: "", email: "" }), respuestas };
  }
  const principal = person(base.data.principal, definition.fields, "principal");
  const integrantes = base.data.integrantes.map((value, i) => {
    const funcion = String((value as Record<string, unknown>)?.funcion ?? "");
    const role = definition.roles.find((r) => r.id === funcion);
    if (!role) errors[`integrantes.${i}.funcion`] = ["Función no permitida"];
    return { ...person(value, role?.fields ?? [], `integrantes.${i}`), funcion };
  });
  for (const role of definition.roles) {
    const count = integrantes.filter((p) => p.funcion === role.id).length;
    if (count < role.min || count > role.max) errors["grupo." + role.id] = [`${role.label}: entre ${role.min} y ${role.max} integrantes`];
  }
  const docs = [principal, ...integrantes].map((p) => normalizeDocument(p.documento));
  if (new Set(docs).size !== docs.length) errors.formulario = ["Cada integrante debe tener un DNI diferente."];
  if (Object.keys(errors).length) throw new FormValidationError(errors);
  return { ...base.data, principal, integrantes };
}

export function coherentIdentity(a: RegistrationInput, b: RegistrationInput) {
  const normalized = (s: string) => s.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
  return normalizeDocument(a.documento) === normalizeDocument(b.documento) && ["nombres", "apellidos", "email"].every((key) => normalized(a[key as keyof RegistrationInput]) === normalized(b[key as keyof RegistrationInput]));
}
