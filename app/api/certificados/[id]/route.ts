import { NextRequest, NextResponse } from "next/server";

import {
  CERTIFICATE_ACCESS_COOKIE,
  unsealCertificateAccess,
} from "@/lib/certificates/public-access";
import { getServerEnv } from "@/lib/env";
import { getCertificateDownload } from "@/lib/services/certificates";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function unavailable() {
  return NextResponse.json(
    { error: "El certificado no está disponible." },
    { status: 404, headers: noStoreHeaders },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.cookies.get(CERTIFICATE_ACCESS_COOKIE)?.value;
  if (!token) return unavailable();

  const authorizedIds = await unsealCertificateAccess(
    token,
    getServerEnv().SESSION_SECRET,
  );
  if (!authorizedIds?.includes(id)) return unavailable();

  try {
    const download = await getCertificateDownload(id);
    const body = download.bytes.buffer.slice(
      download.bytes.byteOffset,
      download.bytes.byteOffset + download.bytes.byteLength,
    ) as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        ...noStoreHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${download.filename}"`,
      },
    });
  } catch {
    return unavailable();
  }
}
