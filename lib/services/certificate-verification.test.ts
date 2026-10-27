import PocketBase, { ClientResponseError } from "pocketbase";
import { beforeEach, expect, it, vi } from "vitest";
import { exhibitorDefinition } from "@/lib/domain/modalities";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ certificates: vi.fn(), event: vi.fn(), registration: vi.fn(), subject: vi.fn(), recipients: vi.fn() }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => ({
  filter: new PocketBase().filter,
  collection: (name: string) => ({ getFullList: name === "certificados" ? mocks.certificates : mocks.recipients, getOne: name === "eventos" ? mocks.event : mocks.registration }),
}) }));
vi.mock("./certificate-subjects", () => ({ certificateSubject: mocks.subject }));
vi.mock("./modalities", () => ({ modalityVersion: async () => ({ esquema: exhibitorDefinition }) }));
import { verifyCertificateCode } from "./certificate-verification";

const eventId = "event0000000001", registrationId = "person000000001", certificateId = "cert00000000001";
const certificate = { id: certificateId, evento: eventId, inscripcion: registrationId, archivo: "emitido.pdf", generado_en: "2026-10-20T13:00:00Z" };
const registration = { id: registrationId, evento: eventId, nombres: "Ana", apellidos: "Pérez", documento: "12345678", email: "privado@example.com", acreditado: true };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.certificates.mockResolvedValue([certificate]);
  mocks.event.mockResolvedValue({ id: eventId, titulo: "Jornada", inicio: "2026-10-19T13:00:00Z", estado: "finalizado" });
  mocks.registration.mockResolvedValue(registration);
  mocks.subject.mockResolvedValue({ eligible: true, hash: "original", mode: { id: "mode", nombre: "Expositor" }, exhibition: { id: "work1", version: "v1", respuestas: { titulo_trabajo: "Trabajo A" } }, members: [{ person: registration, role: "Alumno expositor" }, { person: { id: "second", nombres: "Luis", apellidos: "Gómez", documento: "87.654.321" }, role: "Segundo alumno expositor" }] });
  mocks.recipients.mockResolvedValue([{ participante: registrationId }, { participante: "second" }]);
});

it("recupera nombre y documento del certificado histórico sin reemitir ni exponer correo o PDF", async () => {
  const result = await verifyCertificateCode(`${eventId}-${registrationId}`);
  expect(result.legacy).toBe(true);
  expect(result.certificates).toHaveLength(1);
  expect(mocks.certificates).toHaveBeenCalledWith({ filter: `evento = "${eventId}" && inscripcion = "${registrationId}"`, sort: "-generado_en" });
  const json = JSON.stringify(result);
  for (const privateValue of [registration.email, certificate.archivo]) expect(json).not.toContain(privateValue);
  expect(result.certificates[0].participants).toEqual([{ name: "Pérez, Ana", document: registration.documento, role: "Participante" }]);
});

it("un código actual identifica exactamente una emisión aunque la inscripción tenga varios trabajos", async () => {
  mocks.certificates.mockResolvedValue([certificate, { ...certificate, id: "cert00000000002" }]);
  const result = await verifyCertificateCode("CERT-" + certificateId);
  expect(result.legacy).toBe(false);
  expect(result.certificates).toHaveLength(1);
  expect(mocks.certificates).toHaveBeenCalledWith({ filter: `id = "${certificateId}"`, sort: "-generado_en" });
});

it("muestra todos los trabajos y sus integrantes para un código antiguo compartido", async () => {
  mocks.certificates.mockResolvedValue([1, 2].map((n) => ({ ...certificate, id: "cert0000000000" + n, modalidad: "mode", exposicion: "work" + n, huella: "original" })));
  mocks.subject.mockImplementation(async (_pb, _event, _registration, work: string) => ({ eligible: true, hash: "original", mode: { id: "mode", nombre: "Expositor" }, exhibition: { id: work, version: "v1", respuestas: { titulo_trabajo: "Trabajo " + work } }, members: [{ person: registration, role: "Alumno expositor" }, { person: { id: "second", nombres: "Luis", apellidos: "Gómez", documento: "87.654.321" }, role: "Segundo alumno expositor" }] }));
  const result = await verifyCertificateCode(`${eventId}-${registrationId}`);
  expect(result.certificates.map((c) => c.workTitle)).toEqual(["Trabajo work1", "Trabajo work2"]);
  expect(result.certificates[0].code).not.toBe(result.certificates[1].code);
  expect(result.certificates[0].participants[1].role).toBe("Segundo alumno expositor");
  expect(result.certificates[0].participants.map(p => p.document)).toEqual([registration.documento, "87.654.321"]);
});

it.each(["huella", "grupo", "modalidad", "acreditacion", "destinatarios", "archivo", "evento"])("no valida un certificado inconsistente: %s", async (reason) => {
  mocks.certificates.mockResolvedValue([{ ...certificate, modalidad: "mode", exposicion: "work1", huella: reason === "huella" ? "anterior" : "original", ...(reason === "archivo" ? { archivo: "" } : {}) }]);
  if (reason === "grupo") mocks.subject.mockResolvedValue({ eligible: true, mode: { id: "mode" }, hash: "original", exhibition: { id: "otro" } });
  if (reason === "modalidad") mocks.subject.mockResolvedValue({ eligible: true, mode: { id: "otra" } });
  if (reason === "acreditacion") mocks.registration.mockResolvedValue({ ...registration, acreditado: false });
  if (reason === "destinatarios") mocks.recipients.mockResolvedValue([{ participante: registrationId }]);
  if (reason === "evento") mocks.event.mockResolvedValue({ id: eventId, estado: "borrador" });
  const result = await verifyCertificateCode("CERT-" + certificateId);
  expect(result.certificates).toEqual([]);
  expect(result.unavailableCount).toBe(1);
});

it("distingue un código inexistente de una falla del servicio y rechaza muestras antes de consultar", async () => {
  await expect(verifyCertificateCode("muestra")).rejects.toThrow();
  expect(mocks.certificates).not.toHaveBeenCalled();
  mocks.certificates.mockResolvedValue([]);
  expect((await verifyCertificateCode("CERT-" + certificateId)).certificates).toEqual([]);
  mocks.certificates.mockRejectedValue(new ClientResponseError({ status: 503 }));
  await expect(verifyCertificateCode("CERT-" + certificateId)).rejects.toMatchObject({ status: 503 });
});
