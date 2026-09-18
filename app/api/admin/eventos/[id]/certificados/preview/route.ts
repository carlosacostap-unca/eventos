import { getAuthenticatedAdmin } from "@/lib/auth/session";
import { previewCertificate } from "@/lib/services/certificates";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  try {
    const pdf = await previewCertificate(id);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Disposition": 'inline; filename="vista-previa-certificado.pdf"',
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No se pudo generar la vista previa.", { status: 400 });
  }
}
