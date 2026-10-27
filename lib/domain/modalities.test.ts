import { describe, expect, it } from "vitest";
import { attendeeDefinition, exhibitorDefinition, formSchema, parseSubmission, parseAnswers, coherentIdentity, fieldSchema, SECOND_EXHIBITOR_ROLE, withOptionalSecondExhibitor } from "./modalities";
import { fingerprint } from "./fingerprints";
const person = { nombres: "Ana", apellidos: "Perez", documento: "12345678", email: "ana@example.com", respuestas: {} };
const submission = { modalidad: "modalidad", version: "version", operacion: "123456789012345", principal: { ...person, respuestas: { titulo_trabajo: "Investigación de prueba" } }, integrantes: [{ ...person, nombres: "Luis", documento: "23456789", funcion: "director" }] };
describe("formularios por modalidad", () => {
  it("pide el título al expositor y rechaza títulos vacíos sin exigirlo a los integrantes vinculados", () => {
    expect(parseSubmission(exhibitorDefinition, submission).principal.respuestas.titulo_trabajo).toBe("Investigación de prueba");
    for (const respuestas of [{}, { titulo_trabajo: "" }, { titulo_trabajo: "   " }]) expect(() => parseSubmission(exhibitorDefinition, { ...submission, principal: { ...person, respuestas } })).toThrow();
    expect(parseSubmission(exhibitorDefinition, submission).integrantes[0].respuestas).toEqual({});
    expect(parseSubmission(attendeeDefinition, { ...submission, principal: person, integrantes: [] }).principal.respuestas).toEqual({});
  });
  it("acepta las configuraciones de asistente y expositor", () => { expect(formSchema.parse(attendeeDefinition)).toEqual(attendeeDefinition); expect(formSchema.parse(exhibitorDefinition)).toEqual(exhibitorDefinition); expect(parseSubmission(exhibitorDefinition, submission).integrantes).toHaveLength(1); });
  it("exige director y codirector completo", () => {
    expect(() => parseSubmission(exhibitorDefinition, { ...submission, integrantes: [] })).toThrow();
    expect(() => parseSubmission(exhibitorDefinition, { ...submission, integrantes: [...submission.integrantes, { ...person, documento: "34567890", funcion: "codirector", email: "" }] })).toThrow();
  });
  it("admite cero o un segundo alumno expositor y exige sus datos completos", () => {
    const second = { ...person, nombres: "Segunda", documento: "34567890", funcion: SECOND_EXHIBITOR_ROLE };
    expect(parseSubmission(exhibitorDefinition, submission).integrantes).toHaveLength(1);
    expect(parseSubmission(exhibitorDefinition, { ...submission, integrantes: [...submission.integrantes, second] }).integrantes).toHaveLength(2);
    expect(() => parseSubmission(exhibitorDefinition, { ...submission, integrantes: [...submission.integrantes, { ...second, email: "" }] })).toThrow();
    expect(() => parseSubmission(exhibitorDefinition, { ...submission, integrantes: [...submission.integrantes, second, { ...second, documento: "45678901" }] })).toThrow();
    expect(() => parseSubmission(exhibitorDefinition, { ...submission, integrantes: [...submission.integrantes, { ...second, documento: person.documento }] })).toThrow();
  });
  it("extiende versiones anteriores con la función opcional sin mutar ni duplicar sus campos", () => {
    const old = { ...exhibitorDefinition, roles: exhibitorDefinition.roles.filter((role) => role.id !== SECOND_EXHIBITOR_ROLE) };
    const original = structuredClone(old);
    const extended = withOptionalSecondExhibitor(old);
    expect(old).toEqual(original);
    expect(extended.fields).toEqual(old.fields);
    expect(extended.roles[0]).toMatchObject({ id: SECOND_EXHIBITOR_ROLE, min: 0, max: 1 });
    expect(withOptionalSecondExhibitor(extended)).toEqual(extended);
    expect(parseSubmission(extended, submission).integrantes).toHaveLength(1);
  });
  it("mantiene disponibles las configuraciones que ya agotaron el límite de funciones", () => {
    const definition = { ...exhibitorDefinition, roles: Array.from({ length: 5 }, (_, i) => ({ id: "funcion_" + i, label: "Función " + i, min: 0, max: 1, fields: [] })) };
    expect(formSchema.safeParse(definition).success).toBe(true);
    expect(withOptionalSecondExhibitor(definition)).toEqual(definition);
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
