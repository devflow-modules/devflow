import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import {
  PROSPECT_SOURCES,
  SALES_STAGES,
  type ProspectSource,
  type SalesStage,
} from "@/modules/inbox/prospectSales";
import { patchWaInboxThreadProspect } from "@/modules/inbox/waInboxProspectService";
import { isDevFlowProspectingEnabled } from "@/lib/devflowProspecting";

export const dynamic = "force-dynamic";

const salesStageZ = z.enum(SALES_STAGES as unknown as [SalesStage, ...SalesStage[]]);
const sourceZ = z.enum(PROSPECT_SOURCES as unknown as [ProspectSource, ...ProspectSource[]]);

const bodySchema = z
  .object({
    companyName: z.string().max(200).optional(),
    niche: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    source: sourceZ.optional(),
    salesStage: salesStageZ.optional(),
    nextStep: z.string().max(500).optional(),
    nextFollowUpAt: z.string().max(48).optional(),
    pain: z.string().max(800).optional(),
    attendantsCount: z.string().max(80).optional(),
    estimatedVolume: z.string().max(200).optional(),
    proposalValue: z.number().finite().optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!isDevFlowProspectingEnabled(auth.payload.role)) {
    return NextResponse.json({ error: "Proibido" }, { status: 403 });
  }

  const { id: threadId } = await context.params;
  if (!threadId?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body inválido", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch = parsed.data;
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const result = await patchWaInboxThreadProspect({
    tenantId: auth.payload.tenantId,
    threadId,
    prospectPatch: patch,
  });

  if (!result) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { leadData: result.leadData } });
}
