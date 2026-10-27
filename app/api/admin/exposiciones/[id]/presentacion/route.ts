import { getResourceAccess } from "@/lib/auth/event-access";
import { getPresentationDownload } from "@/lib/services/presentations";
import { materialDownloadHeaders, materialDownloadResponse } from "@/lib/material-download";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getResourceAccess("exposiciones", id);
  if (!admin) return new Response("No autorizado", { status: 401, headers: materialDownloadHeaders });
  try {
    const download = await getPresentationDownload(id, admin.eventId);
    if (new URL(request.url).searchParams.get("ver") === "1" && download.format === "pdf") {
      return new Response(download.body, { headers: { ...materialDownloadHeaders, "Content-Type": "application/pdf", "Content-Disposition": "inline", "Content-Security-Policy": "frame-ancestors 'self'" } });
    }
    return materialDownloadResponse(download);
  } catch { return new Response("Presentación no disponible.", { status: 404, headers: materialDownloadHeaders }); }
}
