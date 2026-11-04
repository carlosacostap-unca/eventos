import PocketBase from "pocketbase";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  registrations: vi.fn(), certificates: vi.fn(), materials: vi.fn(),
  materialExistence: vi.fn(), participantCertificates: vi.fn(),
}));
vi.mock("./modal-resources", () => ({ participantCertificates: mocks.participantCertificates }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => ({
  filter: new PocketBase().filter,
  collection: (name: string) => ({
    getFullList: name === "inscripciones" ? mocks.registrations : name === "certificados" ? mocks.certificates : mocks.materials,
    getList: name === "materiales_evento" ? mocks.materialExistence : undefined,
  }),
}) }));
import { findAccreditedRegistrations, getParticipantResources } from "./participant-resources";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.registrations.mockResolvedValue([{ id: "reg1", evento: "event", acreditado: true, nombres: "Ana", apellidos: "Pérez", expand: { evento: { titulo: "Charla", inicio: "2026-09-29" } } }]);
  mocks.certificates.mockResolvedValue([]);
  mocks.materials.mockResolvedValue([{ id: "material", titulo: "Diapositivas" }]);
});
it("encuentra inscripciones acreditadas por DNI sin depender de certificados", async () => {
  expect(await findAccreditedRegistrations("12345678")).toEqual(["reg1"]);
  expect(mocks.registrations).toHaveBeenCalledWith({ filter: 'documento_normalizado = "12345678"' });
  expect(mocks.certificates).not.toHaveBeenCalled();
});
it("muestra materiales aunque el certificado aún no exista", async () => {
  const result = await getParticipantResources({ registrationIds: ["reg1"], certificateIds: [] });
  expect(result?.events[0]).toMatchObject({ eventId: "event", certificateId: undefined, materials: [{ id: "material" }] });
  expect(mocks.materials).toHaveBeenCalledWith(expect.objectContaining({ filter: 'evento = "event"' }));
});
it.each([
  { items: [], restricted: false },
  { items: [{ id: "material" }], restricted: true },
])("informa materiales restringidos solo cuando existen ($restricted)", async ({ items, restricted }) => {
  mocks.registrations.mockResolvedValue([{
    id: "reg1", evento: "event", modalidad: "expositor", acreditado: false,
    expand: { evento: { titulo: "Charla", inicio: "2026-09-29" } },
  }]);
  mocks.participantCertificates.mockResolvedValue([{ id: "cert1" }]);
  mocks.materialExistence.mockResolvedValue({ items });

  const result = await getParticipantResources({ registrationIds: ["reg1"], certificateIds: [] });

  expect(result?.events[0]).toMatchObject({ materials: [], materialsRestricted: restricted });
  expect(mocks.materialExistence).toHaveBeenCalledWith(1, 1, { filter: 'evento = "event"', fields: "id", skipTotal: true });
  expect(mocks.materials).not.toHaveBeenCalled();
});
it("no muestra recursos de inscripciones ajenas", async () => {
  expect(await getParticipantResources({ registrationIds: ["other"], certificateIds: [] })).toBeNull();
  expect(mocks.materials).not.toHaveBeenCalled();
});
it("deja de mostrar recursos después de revocar la acreditación", async () => {
  mocks.registrations.mockResolvedValue([{ id: "reg1", acreditado: false }]);
  expect(await getParticipantResources({ registrationIds: ["reg1"], certificateIds: [] })).toBeNull();
  expect(mocks.materials).not.toHaveBeenCalled();
});
it("admite autorizaciones anteriores basadas en certificados", async () => {
  mocks.certificates.mockResolvedValue([{ id: "cert1", inscripcion: "reg1" }]);
  expect((await getParticipantResources({ registrationIds: [], certificateIds: ["cert1"] }))?.events[0].certificateId).toBe("cert1");
});
