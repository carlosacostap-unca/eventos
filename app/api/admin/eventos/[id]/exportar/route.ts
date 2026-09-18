import { NextRequest } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/auth/session";
import { registrationsToCsv } from "@/lib/domain/csv";
import { audit } from "@/lib/services/audit";
import { getEventById } from "@/lib/services/events";
import {
  listRegistrations,
  type RegistrationFilters,
} from "@/lib/services/registrations";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return new Response("Evento no encontrado", { status: 404 });

  const source = request.nextUrl.searchParams.get("source");
  const attendance = request.nextUrl.searchParams.get("attendance");
  const filters: RegistrationFilters = {
    query: request.nextUrl.searchParams.get("q")?.trim() || undefined,
    source:
      source === "publica" || source === "presencial" ? source : undefined,
    attendance:
      attendance === "acreditado" || attendance === "ausente"
        ? attendance
        : undefined,
  };
  const registrations = await listRegistrations(id, filters);
  await audit({
    adminId: admin.adminId,
    action: "reporte.exportado",
    entity: "evento",
    entityId: id,
    data: {
      filtros: {
        texto: Boolean(filters.query),
        origen: filters.source || "todos",
        asistencia: filters.attendance || "todos",
      },
      cantidad: registrations.length,
    },
  });

  return new Response(registrationsToCsv(registrations), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition":
        'attachment; filename="participantes-' + event.slug + '.csv"',
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
