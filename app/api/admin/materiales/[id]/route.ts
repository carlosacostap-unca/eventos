import { getAuthenticatedAdmin } from "@/lib/auth/session";
import { getMaterialDownload } from "@/lib/services/materials";
import { materialDownloadHeaders, materialDownloadResponse } from "@/lib/material-download";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return new Response("No autorizado", { status: 401, headers: materialDownloadHeaders });
  try {
    return materialDownloadResponse(await getMaterialDownload((await params).id, { admin: true }));
  } catch {
    return new Response("Material no disponible.", { status: 404, headers: materialDownloadHeaders });
  }
}
