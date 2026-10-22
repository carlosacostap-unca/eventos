import { getEventAccess } from "@/lib/auth/event-access";
import { previewCertificate } from "@/lib/services/certificates";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = await getEventAccess(id);
  if (!admin) return new Response("No autorizado", { status: 401 });
  try {
    const pdf = await previewCertificate(id, new URL(request.url).searchParams.get("modalidad") ?? undefined);
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
