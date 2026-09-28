import { ClientResponseError } from "pocketbase";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getEvent: vi.fn(), registrations: vi.fn(), pdf: vi.fn(),
  find: vi.fn(), create: vi.fn(), update: vi.fn(), audit: vi.fn(),
}));
vi.mock("@/lib/services/events", () => ({ getEventById: mocks.getEvent }));
vi.mock("@/lib/services/event-types", () => ({ getEventTypeById: vi.fn() }));
vi.mock("@/lib/services/registrations", () => ({ listRegistrations: mocks.registrations }));
vi.mock("@/lib/certificates/pdf", () => ({ createCertificatePdf: mocks.pdf }));
vi.mock("@/lib/services/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/pocketbase/client", () => ({
  createServicePocketBase: async () => ({
    filter: (_filter: string, params: unknown) => JSON.stringify(params),
    collection: () => ({ getFirstListItem: mocks.find, create: mocks.create, update: mocks.update }),
  }),
}));

import { generateCertificates } from "./certificates";

const event = { id: "event", certificado_asistencia: "si", textos_certificado: { participation: "Texto actualizado" } };
const registration = { id: "student", acreditado: true, documento_normalizado: "123456" };

describe("emisión y regeneración de certificados", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getEvent.mockResolvedValue(event);
    mocks.registrations.mockResolvedValue([registration, { id: "absent", acreditado: false }]);
    mocks.find.mockResolvedValue({ id: "existing", archivo: "anterior.pdf" });
    mocks.pdf.mockResolvedValue(new TextEncoder().encode("PDF actualizado"));
  });

  it("conserva los PDFs existentes en la generación normal", async () => {
    expect(await generateCertificates("event", "admin")).toEqual({ created: 0, reused: 1, regenerated: 0, eligible: 1 });
    expect(mocks.pdf).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("reemplaza el archivo conservando el ID y usando los textos actuales", async () => {
    expect(await generateCertificates("event", "admin", { regenerate: true })).toEqual({ created: 0, reused: 0, regenerated: 1, eligible: 1 });
    expect(mocks.pdf).toHaveBeenCalledWith({ event, registration, template: undefined, eventTypeName: "Evento" });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    const [id, form] = mocks.update.mock.calls[0];
    expect(id).toBe("existing");
    expect(await (form.get("archivo") as File).text()).toBe("PDF actualizado");
    expect(form.get("generado_en")).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "certificados.regenerados", data: { created: 0, reused: 0, regenerated: 1, eligible: 1 } }));
  });

  it("genera los certificados faltantes durante la regeneración", async () => {
    mocks.find.mockRejectedValue(new ClientResponseError({ status: 404 }));
    expect(await generateCertificates("event", "admin", { regenerate: true })).toEqual({ created: 1, reused: 0, regenerated: 0, eligible: 1 });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("no confunde errores de consulta con certificados faltantes", async () => {
    mocks.find.mockRejectedValue(new ClientResponseError({ status: 500 }));
    await expect(generateCertificates("event", "admin", { regenerate: true })).rejects.toMatchObject({ status: 500 });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("no reemplaza el archivo si falla la creación del PDF", async () => {
    mocks.pdf.mockRejectedValue(new Error("PDF inválido"));
    await expect(generateCertificates("event", "admin", { regenerate: true })).rejects.toThrow("PDF inválido");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("rechaza la regeneración si el evento no entrega certificados", async () => {
    mocks.getEvent.mockResolvedValue({ ...event, certificado_asistencia: "no" });
    await expect(generateCertificates("event", "admin", { regenerate: true })).rejects.toMatchObject({ code: "DISABLED" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
