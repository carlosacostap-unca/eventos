import { describe, expect, it, vi } from "vitest";
import type PocketBase from "pocketbase";
import type { EventRecord, RegistrationRecord } from "@/lib/domain/models";
import { exhibitorDefinition } from "@/lib/domain/modalities";
vi.mock("server-only", () => ({}));
vi.mock("./modalities", () => ({ modalityVersion: async () => ({ modalidad: "mode", esquema: exhibitorDefinition }) }));
import { certificateSubject } from "./certificate-subjects";
function fixture(studentPresent: boolean, directorPresent: boolean, codirectorPresent: boolean, delivery = true) {
  const people = [studentPresent, directorPresent, codirectorPresent].map((acreditado, i) => ({ id: String(i), evento: "event", modalidad: "mode", tipo_alta: i === 0 ? "principal" : "vinculada", nombres: "Nombre" + i, apellidos: "Apellido", documento: "1234567" + i, acreditado, version_formulario: "version" })) as RegistrationRecord[];
  const pb = { filter: () => "filter", collection: (name: string) => ({ getOne: async (id: string) => name === "modalidades_inscripcion" ? { id: "mode", evento: "event", entrega: delivery } : people.find((p) => p.id === id), getFullList: async () => name === "exposiciones" ? [{ id: "group", modalidad: "mode" }] : people.map((p, i) => ({ participante: p.id, funcion: i === 0 ? "principal" : i === 1 ? "director" : "codirector", etiqueta: "Función" + i })) }) } as unknown as PocketBase;
  return { pb, people, event: { id: "event" } as EventRecord };
}
describe("regla del certificado compartido", () => {
  it("cambiar el título del trabajo invalida el PDF emitido y los formularios vacíos conservan su huella anterior", async () => {
    const { pb, people, event } = fixture(true, false, false);
    const original = await certificateSubject(pb, event, people[0]);
    people[0].respuestas = {};
    expect((await certificateSubject(pb, event, people[0]))?.hash).toBe(original?.hash);
    people[0].respuestas = { titulo_trabajo: "Trabajo original" };
    const titled = await certificateSubject(pb, event, people[0]);
    people[0].respuestas.titulo_trabajo = "Trabajo corregido";
    expect((await certificateSubject(pb, event, people[0]))?.hash).not.toBe(titled?.hash);
  });
  for (const student of [true, false]) for (const director of [true, false]) for (const codirector of [true, false]) it(`alumno=${student}, director=${director}, codirector=${codirector}`, async () => {
    const { pb, people, event } = fixture(student, director, codirector);
    expect((await certificateSubject(pb, event, people[0]))?.eligible).toBe(student);
  });
  it("deshabilita entrega y no genera documentos propios para vinculados", async () => {
    const { pb, people, event } = fixture(true, true, true, false);
    expect((await certificateSubject(pb, event, people[0]))?.eligible).toBe(false);
    expect(await certificateSubject(pb, event, people[1])).toBeNull();
  });
  it("la presencia del director no altera la huella de identidad del PDF", async () => {
    const a = fixture(true, true, false), b = fixture(true, false, true);
    expect((await certificateSubject(a.pb, a.event, a.people[0]))?.hash).toBe((await certificateSubject(b.pb, b.event, b.people[0]))?.hash);
  });
});
