import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getAuthFromRequest } from "@/modules/auth";

const noStore = { "Cache-Control": "no-store" as const };

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { headers: noStore });
  }

  const { payload } = auth;
  return jsonSuccess(
    {
      valid: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        tenantId: payload.tenantId,
      },
    },
    { headers: noStore }
  );
}
