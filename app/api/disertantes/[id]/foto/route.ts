import { getAuthenticatedAdmin } from "@/lib/auth/session";
import type { SpeakerRecord } from "@/lib/domain/models";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { getEventById } from "@/lib/services/events";
import { getSpeakerById, listSpeakerEventIds } from "@/lib/services/speakers";
import type { RecordModel } from "pocketbase";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const speaker = await getSpeakerById(id);
  if (!speaker?.foto) return new Response("Foto no encontrada.", { status: 404 });
  const eventIds = await listSpeakerEventIds(id);
  const events = await Promise.all(eventIds.map(getEventById));
  if (!events.some((event) => event && event.estado !== "borrador") &&
      !(await getAuthenticatedAdmin())) {
    return new Response("Foto no encontrada.", { status: 404 });
  }

  try {
    const pb = await createServicePocketBase();
    const url = pb.files.getURL(speaker as SpeakerRecord & RecordModel, speaker.foto);
    const response = await fetch(url, {
      headers: { Authorization: pb.authStore.token },
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type")?.split(";")[0] || "";
    if (!response.ok || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return new Response("Foto no disponible.", { status: 404 });
    }
    return new Response(response.body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Foto no disponible.", { status: 404 });
  }
}
