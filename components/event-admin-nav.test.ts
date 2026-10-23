import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { EventRecord } from "@/lib/domain/models";

const mocks = vi.hoisted(() => ({ access: vi.fn() }));
vi.mock("@/lib/auth/event-access", () => ({ getEventAccess: mocks.access }));
vi.mock("@/components/active-nav-link", () => ({ ActiveNavLink: ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement("a", { href }, children) }));
import { EventAdminNav } from "./event-admin-nav";

const event = { id: "event-A", titulo: "Actividad" } as EventRecord;
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("React", React); });

it.each(["admin", "personal"])("ubica Inscritos inmediatamente después de Resumen para %s", async role => {
  mocks.access.mockResolvedValue({ role, eventRole: "administrador_evento" });
  const html = renderToStaticMarkup(await EventAdminNav({ event }));
  expect(html).toContain('Resumen</a><a href="/admin/eventos/event-A/inscritos">Inscritos</a>');
});

it("no ofrece la consulta de inscritos al acreditador", async () => {
  mocks.access.mockResolvedValue({ role: "personal", eventRole: "acreditador" });
  const html = renderToStaticMarkup(await EventAdminNav({ event }));
  expect(html).not.toContain("Inscritos"); expect(html).toContain("Acreditación");
});
