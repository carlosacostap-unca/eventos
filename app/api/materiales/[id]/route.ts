import { NextRequest } from "next/server";
import { CERTIFICATE_ACCESS_COOKIE, unsealParticipantAccess } from "@/lib/certificates/public-access";
import { getServerEnv } from "@/lib/env";
import { getMaterialDownload } from "@/lib/services/materials";
import { materialDownloadHeaders, materialDownloadResponse } from "@/lib/material-download";
import { createServicePocketBase } from "@/lib/pocketbase/client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unavailable = () => new Response("Material no disponible. Volvé a consultar tu documento.", { status: 404, headers: materialDownloadHeaders });
  const token = request.cookies.get(CERTIFICATE_ACCESS_COOKIE)?.value;
  if (!token) return unavailable();
  try {
    const access = await unsealParticipantAccess(token, getServerEnv().SESSION_SECRET);
    if (!access) return unavailable();
    let registrationIds = access.registrationIds;
    if (!registrationIds.length && access.certificateIds.length) {
      const pb = await createServicePocketBase();
      const certificates = await pb.collection("certificados").getFullList({
        filter: access.certificateIds.map((id) => `(${pb.filter("id = {:id}", { id })})`).join(" || "), fields: "id,inscripcion",
      });
      registrationIds = certificates.filter((record) => access.certificateIds.includes(record.id)).map((record) => String(record.inscripcion));
    }
    return materialDownloadResponse(await getMaterialDownload((await params).id, { registrationIds }));
  } catch { return unavailable(); }
}
