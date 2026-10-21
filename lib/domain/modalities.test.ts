import { describe, expect, it } from "vitest";
import { attendeeDefinition, exhibitorDefinition, formSchema, parseSubmission, parseAnswers, coherentIdentity, fieldSchema } from "./modalities";
import { fingerprint } from "./fingerprints";
const person = { nombres: "Ana", apellidos: "Perez", documento: "12345678", email: "ana@example.com", respuestas: {} };
const submission = { modalidad: "modalidad", version: "version", operacion: "123456789012345", principal: person, integrantes: [{ ...person, nombres: "Luis", documento: "23456789", funcion: "director" }] };
describe("formularios por modalidad", () => {
  it("acepta las configuraciones de asistente y expositor", () => { expect(formSchema.parse(attendeeDefinition)).toEqual(attendeeDefinition); expect(formSchema.parse(exhibitorDefinition)).toEqual(exhibitorDefinition); expect(parseSubmission(exhibitorDefinition, submission).integrantes).toHaveLength(1); });
  it("exige director y codirector completo", () => {
    expect(() => parseSubmission(exhibitorDefinition, { ...submission, integrantes: [] })).toThrow();
    expect(() => parseSubmission(exhibitorDefinition, { ...submission, integrantes: [...submission.integrantes, { ...person, documento: "34567890", funcion: "codirector", email: "" }] })).toThrow();
  });
  it("rechaza DNI repetido y funciones desconocidas", () => {
    expect(() => parseSubmission(exhibitorDefinition, { ...submission, integrantes: [{ ...person, funcion: "director" }] })).toThrow();
    expect(() => parseSubmission(exhibitorDefinition, { ...submission, integrantes: [{ ...person, documento: "23456789", funcion: "otro" }] })).toThrow();
  });
  it("impide redefinir identidad, ids repetidos y cardinalidades inválidas", () => {
    expect(fieldSchema.safeParse({ id: "email", label: "Email", type: "text", required: false }).success).toBe(false);
    expect(formSchema.safeParse({ ...exhibitorDefinition, roles: [{ ...exhibitorDefinition.roles[0], min: 2 }] }).success).toBe(false);
    expect(formSchema.safeParse({ ...attendeeDefinition, certificate: "grupo" }).success).toBe(false);
    expect(formSchema.safeParse({ ...exhibitorDefinition, roles: [exhibitorDefinition.roles[0], exhibitorDefinition.roles[0]] }).success).toBe(false);
    expect(formSchema.safeParse({ ...exhibitorDefinition, roles: [{ ...exhibitorDefinition.roles[0], id: "principal" }] }).success).toBe(false);
  });
  it("valida opciones, tipos, mínimos y campos desconocidos", () => {
    const fields = [fieldSchema.parse({ id: "carrera", label: "Carrera", type: "select", required: true, options: ["Sistemas"] }), fieldSchema.parse({ id: "telefono", label: "Teléfono", type: "tel", required: true })];
    expect(parseAnswers(fields, { carrera: "Sistemas", telefono: "+54 383 1234567" })).toMatchObject({ carrera: "Sistemas" });
    expect(() => parseAnswers(fields, { carrera: "Otra", telefono: "abc" })).toThrow();
    expect(() => parseAnswers([], { desconocido: "dato" })).toThrow();
    expect(() => parseAnswers([fieldSchema.parse({ id: "acepta", label: "Acepta", type: "checkbox", required: true })], { acepta: false })).toThrow();
  });
  it("compara identidades sin sobrescribir diferencias", () => {
    expect(coherentIdentity(person, { ...person, documento: "12.345.678", nombres: " ANA ", email: "ANA@example.com" })).toBe(true);
    expect(coherentIdentity(person, { ...person, email: "otra@example.com" })).toBe(false);
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }));
  });
});
