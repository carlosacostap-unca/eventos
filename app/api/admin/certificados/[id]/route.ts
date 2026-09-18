import { getAuthenticatedAdmin } from "@/lib/auth/session";
import { getCertificateDownload } from "@/lib/services/certificates";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  try {
    const file = await getCertificateDownload(id);
    return new Response(Buffer.from(file.bytes), {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Disposition": 'attachment; filename="' + file.filename + '"',
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Certificado no encontrado.", { status: 404 });
  }
}
