import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { suggestInboxPlaybook } from "@/modules/inbox";
import {
  enforceUsageOrThrow,
  UsageLimitExceededError,
  usageLimitErrorToPayload,
} from "@/modules/billing/enforcementService";
import { logError } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const { id: threadId } = await context.params;
  if (!threadId?.trim()) {
    return NextResponse.json({ success: false, error: "id obrigatório" }, { status: 400 });
  }

  const tenantId = auth.payload.tenantId;

  try {
    await enforceUsageOrThrow({ tenantId, feature: "ai", quantity: 1 });
  } catch (e) {
    if (e instanceof UsageLimitExceededError) {
      return NextResponse.json(
        { success: false, error: usageLimitErrorToPayload(e) },
        { status: 402 }
      );
    }
    throw e;
  }

  try {
    const result = await suggestInboxPlaybook({
      tenantId,
      threadId,
      userId: auth.payload.sub,
    });
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: { message: result.error } },
        { status: 502 }
      );
    }
    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (e) {
    logError("inbox", e, { route: "suggest_playbook", threadId });
    return NextResponse.json(
      {
        success: false,
        error: { message: e instanceof Error ? e.message : "Erro ao gerar playbook" },
      },
      { status: 502 }
    );
  }
}
