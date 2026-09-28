import PocketBase from "pocketbase";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ registrations: vi.fn(), certificates: vi.fn() }));
vi.mock("@/lib/pocketbase/client", () => ({
  createServicePocketBase: async () => ({
    filter: new PocketBase().filter,
    collection: (name: string) => ({
      getFullList: name === "inscripciones" ? mocks.registrations : mocks.certificates,
    }),
  }),
}));

import { findPublicCertificates, getPublicCertificateResults, normalizeCertificateLookup } from "./certificate-lookup";

beforeEach(() => vi.resetAllMocks());

it("obtiene nombre y certificados solo a partir de los IDs autorizados", async () => {
  const expand = {
    evento: { titulo: "Jornada", inicio: "2026-10-15" },
    inscripcion: { apellidos: "Pérez", nombres: "Juan", acreditado: true },
  };
  mocks.certificates.mockResolvedValue([
    { id: "cert1", expand },
    { id: "other", expand },
    { id: "absent", expand: { ...expand, inscripcion: { ...expand.inscripcion, acreditado: false } } },
  ]);
  expect(await getPublicCertificateResults(["cert1", "absent"])).toEqual({
    participant: { apellidos: "Pérez", nombres: "Juan" },
    certificates: [{ id: "cert1", eventTitle: "Jornada", eventDate: "2026-10-15" }],
  });
  expect(mocks.certificates).toHaveBeenCalledWith({
    filter: '(id = "cert1") || (id = "absent")', expand: "evento,inscripcion", sort: "-generado_en",
  });
});

it("no busca resultados sin IDs autorizados", async () => {
  expect(await getPublicCertificateResults([])).toBeNull();
  expect(mocks.certificates).not.toHaveBeenCalled();
});

it("busca inscripciones acreditadas por documento sin filtrar por email", async () => {
  mocks.registrations.mockResolvedValue([{ id: "registration1" }, { id: "registration2" }]);
  mocks.certificates.mockResolvedValue([
    { id: "cert1", expand: { evento: { titulo: "Evento 1", inicio: "2026-10-15" } } },
    { id: "cert2", expand: { evento: { titulo: "Evento 2", inicio: "2026-11-15" } } },
  ]);
  const result = await findPublicCertificates(normalizeCertificateLookup({ document: "12.345.678" }));
  expect(mocks.registrations).toHaveBeenCalledWith({
    filter: 'documento_normalizado = "12345678" && acreditado = true', fields: "id",
  });
  expect(mocks.certificates).toHaveBeenCalledWith({
    filter: '(inscripcion = "registration1") || (inscripcion = "registration2")',
    sort: "-generado_en", expand: "evento",
  });
  expect(result.map(item => item.id)).toEqual(["cert1", "cert2"]);
});

it("no consulta certificados si no hay inscripciones acreditadas para el documento", async () => {
  mocks.registrations.mockResolvedValue([]);
  expect(await findPublicCertificates({ normalizedDocument: "99999999" })).toEqual([]);
  expect(mocks.certificates).not.toHaveBeenCalled();
});
