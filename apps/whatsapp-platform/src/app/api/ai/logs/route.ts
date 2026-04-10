import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { listRecentAiLogs, type AiLogEventType } from "@/modules/ai/aiLogsService";
import { allowAiLogsRequest, aiLogsRateLimitKey } from "@/lib/aiLogsRateLimit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  type: z.enum(["auto_reply", "fallback", "error", "blocked_by_guard"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;

  const key = aiLogsRateLimitKey(tenantId, userId);
  if (!allowAiLogsRequest(key)) {
    return NextResponse.json(
      { success: false, error: "Demasiados pedidos. Tente novamente dentro de um minuto." },
      { status: 429 }
    );
  }

  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    limit: sp.get("limit") ?? undefined,
    type: sp.get("type") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Parâmetros inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { limit, type } = parsed.data;
  const data = await listRecentAiLogs(tenantId, {
    limit,
    type: type as AiLogEventType | undefined,
  });

  return NextResponse.json({ success: true, data });
}
