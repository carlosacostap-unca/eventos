import { beforeEach, expect, it, vi } from "vitest";
import { attendeeDefinition, exhibitorDefinition, SECOND_EXHIBITOR_ROLE } from "@/lib/domain/modalities";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getOne: vi.fn() }));
vi.mock("@/lib/pocketbase/client", () => ({ createServicePocketBase: async () => ({ collection: (name: string) => ({ getOne: (id: string) => mocks.getOne(name, id) }) }) }));
import { modalityVersion } from "./modalities";

const oldDefinition = { ...exhibitorDefinition, roles: exhibitorDefinition.roles.filter((role) => role.id !== SECOND_EXHIBITOR_ROLE) };
beforeEach(() => vi.resetAllMocks());

it("habilita el segundo alumno para una modalidad Expositor existente sin escribir una nueva versión", async () => {
  const record = { id: "v1", modalidad: "mode", numero: 1, esquema: oldDefinition };
  mocks.getOne.mockImplementation(async (name) => name === "versiones_modalidad" ? record : { id: "mode", codigo: "expositor" });
  const version = await modalityVersion("v1");
  expect(version).toMatchObject({ id: "v1", numero: 1, esquema: { roles: expect.arrayContaining([expect.objectContaining({ id: SECOND_EXHIBITOR_ROLE, min: 0, max: 1 })]) } });
  expect(record.esquema.roles).toHaveLength(2);
});

it("mantiene las modalidades personalizadas y de Asistente con sus propias funciones", async () => {
  mocks.getOne.mockImplementation(async (name) => name === "versiones_modalidad" ? { id: "v1", modalidad: "mode", esquema: oldDefinition } : { id: "mode", codigo: "personalizada" });
  expect((await modalityVersion("v1")).esquema).toEqual(oldDefinition);
  mocks.getOne.mockResolvedValue({ id: "v2", modalidad: "attendee", esquema: attendeeDefinition });
  expect((await modalityVersion("v2")).esquema).toEqual(attendeeDefinition);
});
