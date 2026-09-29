import { beforeEach, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/domain/errors";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), update: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/lib/services/events", () => ({ getEventBySlug: vi.fn() }));
vi.mock("@/lib/services/registrations", () => ({ updateRegistration: mocks.update }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { updateRegistrationAction } from "./registrations";

function form() {
  const data = new FormData();
  Object.entries({ nombres: "Ana", apellidos: "Pérez", documento: "12345678", email: "ana@example.com" }).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue({ adminId: "admin" });
});

it("exige sesión administrativa antes de editar", async () => {
  mocks.admin.mockRejectedValue(new Error("Unauthorized"));
  await expect(updateRegistrationAction("event", "person", {}, form())).rejects.toThrow("Unauthorized");
  expect(mocks.update).not.toHaveBeenCalled();
});

it("devuelve errores de campos sin guardar", async () => {
  const data = form();
  data.set("email", "inválido");
  expect((await updateRegistrationAction("event", "person", {}, data)).fields?.email).toBeDefined();
  expect(mocks.update).not.toHaveBeenCalled();
});

it("guarda y actualiza acreditación, reportes y certificados", async () => {
  expect((await updateRegistrationAction("event", "person", {}, form())).ok).toBe(true);
  expect(mocks.update).toHaveBeenCalledWith("event", "person", expect.objectContaining({ documento: "12345678" }), "admin");
  for (const suffix of ["", "/acreditacion", "/reportes", "/certificados"]) {
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/eventos/event" + suffix);
  }
});

it("muestra el conflicto de DNI sin anunciar éxito", async () => {
  mocks.update.mockRejectedValue(new DomainError("DUPLICATE", "Documento duplicado"));
  expect(await updateRegistrationAction("event", "person", {}, form())).toEqual({ message: "Documento duplicado" });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
