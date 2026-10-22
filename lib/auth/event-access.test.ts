import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ staff: vi.fn(), getList: vi.fn(), getOne: vi.fn(), getFullList: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedStaff: mocks.staff }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("Not found"); }, redirect: () => { throw new Error("Login"); } }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => ({ filter: (s: string, p: unknown) => JSON.stringify([s, p]), collection: () => mocks }) }));
import { getEventAccess, requireEventAccess, getResourceAccess, assignedEventRoles } from "./event-access";
const staff = { adminId: "person", role: "personal", name: "Personal", email: "staff@example.com" };
beforeEach(() => { vi.resetAllMocks(); mocks.staff.mockResolvedValue(staff); mocks.getList.mockResolvedValue({ items: [] }); });
describe("aislamiento administrativo por evento", () => {
  it.each(["manage", "accredit"] as const)("el general accede a %s sin asignaciones", async capability => {
    mocks.staff.mockResolvedValue({ ...staff, role: "admin" });
    expect(await getEventAccess("A", capability)).toMatchObject({ eventRole: "administrador_evento" });
    expect(mocks.getList).not.toHaveBeenCalled();
  });
  it.each([
    ["administrador_evento", "manage", true], ["administrador_evento", "accredit", true],
    ["acreditador", "manage", false], ["acreditador", "accredit", true],
    ["unknown", "accredit", false],
  ] as const)("rol %s, capacidad %s: %s", async (rol, capability, permitted) => {
    mocks.getList.mockResolvedValue({ items: [{ rol }] });
    expect(Boolean(await getEventAccess("A", capability))).toBe(permitted);
    expect(mocks.getList.mock.calls[0][2].filter).toContain('"event":"A"');
    expect(mocks.getList.mock.calls[0][2].filter).toContain('"user":"person"');
  });
  it("una asignación no sobrevive a la revocación", async () => {
    mocks.getList.mockResolvedValueOnce({ items: [{ rol: "acreditador" }] }).mockResolvedValueOnce({ items: [] });
    expect(await getEventAccess("A", "accredit")).not.toBeNull();
    expect(await getEventAccess("A", "accredit")).toBeNull();
    await expect(requireEventAccess("B")).rejects.toThrow("Not found");
  });
  it("descarga según el evento real del archivo y deniega fallos de verificación", async () => {
    mocks.getOne.mockResolvedValue({ evento: "B" });
    expect(await getResourceAccess("materiales_evento", "file-of-B")).toBeNull();
    expect(mocks.getList.mock.calls[0][2].filter).toContain('"event":"B"');
    mocks.getList.mockRejectedValue(new Error("Database unavailable"));
    expect(await getEventAccess("A")).toBeNull();
  });
  it("sin identidad no consulta recursos protegidos", async () => {
    mocks.staff.mockResolvedValue(null);
    expect(await getResourceAccess("certificados", "id")).toBeNull();
    expect(mocks.getOne).not.toHaveBeenCalled();
    await expect(requireEventAccess("A")).rejects.toThrow("Login");
  });
  it("solo devuelve roles reconocidos en eventos asignados", async () => {
    mocks.getFullList.mockResolvedValue([{ evento: "A", rol: "administrador_evento" }, { evento: "B", rol: "acreditador" }, { evento: "C", rol: "invalid" }]);
    expect([...await assignedEventRoles(staff as Parameters<typeof assignedEventRoles>[0])]).toEqual([["A", "administrador_evento"], ["B", "acreditador"]]);
  });
});
