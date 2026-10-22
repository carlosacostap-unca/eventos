import { NextRequest } from "next/server";

import { getEventAccess } from "@/lib/auth/event-access";
import { participantCsv } from "@/lib/services/participant-reports";
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
  const { id } = await params;
  const admin = await getEventAccess(id);
  if (!admin) return new Response("No autorizado", { status: 401 });
  const event = await getEventById(id);
  if (!event) return new Response("Evento no encontrado", { status: 404 });

  const source = request.nextUrl.searchParams.get("source");
  const attendance = request.nextUrl.searchParams.get("attendance");
  const filters: RegistrationFilters = {
    modality: request.nextUrl.searchParams.get("modality") || undefined,
    role: request.nextUrl.searchParams.get("role") || undefined,
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

  return new Response(await participantCsv(id, filters, request.nextUrl.searchParams.get("groups") === "1"), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition":
        'attachment; filename="participantes-' + event.slug + '.csv"',
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
