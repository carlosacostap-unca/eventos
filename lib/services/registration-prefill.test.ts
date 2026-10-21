import PocketBase from "pocketbase";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ list: vi.fn(), limit: vi.fn(), lock: vi.fn() }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => ({ filter: new PocketBase().filter, collection: () => ({ getList: mocks.list }) }) }));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ SESSION_SECRET: "test-secret" }) }));
vi.mock("./certificate-lookup", () => ({ consumePersistentLookupAttempt: mocks.limit }));
vi.mock("./operation-lock", () => ({ withOperationLock: mocks.lock }));
import { allowRegistrationPrefill, findRegistrationIdentity } from "./registration-prefill";
import { consumeLookupAttempt } from "@/lib/certificates/public-access";

const person = { nombres: "Ana", apellidos: "Pérez", documento: "12345678", email: "ana@example.com" };
beforeEach(() => vi.resetAllMocks());

it("busca por coincidencia exacta normalizada y toma la inscripción más reciente", async () => {
  mocks.list.mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: [{ ...person, id: "private", evento: "private-event", respuestas: { titulo_trabajo: "private work" }, acreditado: true }] });
  expect(await findRegistrationIdentity("12.345.678", "event")).toEqual(person);
  expect(mocks.list).toHaveBeenLastCalledWith(1, 1, { fields: "nombres,apellidos,documento,email", sort: "-updated,-created,-id", filter: 'documento_normalizado = "12345678"' });
});

it("prioriza al integrante del evento actual para conservar coherencia", async () => {
  mocks.list.mockResolvedValue({ items: [person] });
  expect(await findRegistrationIdentity("12.345.678", "event")).toEqual(person);
  expect(mocks.list).toHaveBeenCalledTimes(1);
  expect(mocks.list.mock.calls[0][2].filter).toBe('documento_normalizado = "12345678" && evento = "event"');
});

it("no devuelve datos incompletos ni errores como coincidencias", async () => {
  mocks.list.mockResolvedValue({ items: [] });
  expect(await findRegistrationIdentity("12345678", "event")).toBeNull();
  mocks.list.mockResolvedValue({ items: [{ ...person, email: "invalid" }] });
  expect(await findRegistrationIdentity("12345678", "event")).toBeNull();
  mocks.list.mockRejectedValue(new Error("unavailable"));
  await expect(findRegistrationIdentity("12345678", "event")).rejects.toThrow("unavailable");
});

it("coordina la cuota entre réplicas y no guarda DNI ni IP en la clave de bloqueo", async () => {
  mocks.lock.mockImplementation((_pb, _key, run) => run());
  mocks.limit.mockResolvedValue(true);
  expect(await allowRegistrationPrefill("127.0.0.1")).toBe(true);
  const key = mocks.lock.mock.calls[0][1];
  expect(key).toMatch(/^prefill:[a-f0-9]{64}$/);
  expect(key).not.toContain("127.0.0.1");
  expect(mocks.limit).toHaveBeenCalledWith({ origin: "registration-prefill:127.0.0.1", normalizedDocument: "all-documents", maxAttempts: 30 });
});

it("aplica 30 consultas por origen y conserva las cinco del portal de certificados", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  const current = { windowStartedAt: now.toISOString(), attempts: 5 };
  expect(consumeLookupAttempt(current, now).allowed).toBe(false);
  expect(consumeLookupAttempt(current, now, 30).allowed).toBe(true);
  expect(consumeLookupAttempt({ ...current, attempts: 30 }, now, 30).allowed).toBe(false);
  expect(consumeLookupAttempt({ ...current, attempts: 30 }, new Date(now.getTime() + 15 * 60000), 30).allowed).toBe(true);
});
