import { secretsMatch } from "@/lib/auth/secrets";
import { getServerEnv } from "@/lib/env";
import { processPendingDeliveries } from "@/lib/services/certificates";

export const dynamic = "force-dynamic";

function validSecret(request: Request) {
  const authorization = request.headers.get("authorization");
  const supplied =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : request.headers.get("x-internal-secret") || "";
  return secretsMatch(getServerEnv().INTERNAL_JOBS_SECRET, supplied);
}

export async function POST(request: Request) {
  if (!validSecret(request)) {
    return Response.json(
      { error: "No autorizado" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const result = await processPendingDeliveries(20);
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
