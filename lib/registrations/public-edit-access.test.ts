import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ SESSION_SECRET: "public-edit-tests-secret" }) }));
import { signRegistrationEdit, verifyRegistrationEdit } from "./public-edit-access";

const access = { eventId: "event", registrationId: "person", document: "12345678", revision: "revision" };
afterEach(() => vi.useRealTimers());
it("limita el permiso al evento y DNI consultados", async () => {
  const token = await signRegistrationEdit(access);
  expect(await verifyRegistrationEdit(token, "event", "12345678")).toEqual(access);
  await expect(verifyRegistrationEdit(token, "other", "12345678")).rejects.toMatchObject({ code: "INVALID" });
  await expect(verifyRegistrationEdit(token, "event", "87654321")).rejects.toMatchObject({ code: "INVALID" });
  await expect(verifyRegistrationEdit(token + "invalid", "event", "12345678")).rejects.toMatchObject({ code: "INVALID" });
});
it("vence a los 30 minutos y pide buscar nuevamente el DNI", async () => {
  vi.useFakeTimers();
  const token = await signRegistrationEdit(access);
  vi.advanceTimersByTime(30 * 60 * 1000);
  await expect(verifyRegistrationEdit(token, "event", "12345678")).rejects.toThrow("Volvé a buscar tu DNI");
});
