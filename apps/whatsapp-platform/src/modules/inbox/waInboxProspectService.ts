import { prisma } from "@/lib/prisma";
import { mergeProspectData, type ProspectData } from "@/modules/inbox/prospectSales";
import { parseLeadDataJson, type LeadData } from "@/modules/inbox/leadCrm";

/**
 * Atualiza apenas `leadData.prospect`, mantendo o restante de `lead_data` intacto.
 */
export async function patchWaInboxThreadProspect(params: {
  tenantId: string;
  threadId: string;
  prospectPatch: Partial<ProspectData>;
}): Promise<{ leadData: LeadData } | null> {
  const { tenantId, threadId, prospectPatch } = params;

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { leadData: true },
  });
  if (!thread) return null;

  const current = parseLeadDataJson(thread.leadData);
  const nextProspect = mergeProspectData(current.prospect, prospectPatch);
  const nextLeadData: LeadData = { ...current };
  if (Object.keys(nextProspect).length > 0) {
    nextLeadData.prospect = nextProspect;
  } else {
    delete nextLeadData.prospect;
  }

  await prisma.waInboxThread.update({
    where: { id: threadId },
    data: { leadData: nextLeadData as object },
  });

  return { leadData: nextLeadData };
}
