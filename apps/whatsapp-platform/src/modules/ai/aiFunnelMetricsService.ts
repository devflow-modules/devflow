import { prisma } from "@/lib/prisma";
import type { AiState } from "@/modules/ai/conversationStateService";

export type AiFunnelCounts = Record<AiState, number>;

const STATES: AiState[] = ["lead", "qualifying", "negotiating", "support", "closed"];

function bucket(raw: string | null | undefined): AiState {
  if (!raw?.trim()) return "lead";
  const s = raw.trim();
  if (STATES.includes(s as AiState)) return s as AiState;
  return "lead";
}

/**
 * Contagem de threads abertas/fechadas por snapshot de `aiState` (funil actual).
 */
export async function getAiFunnelMetrics(tenantId: string): Promise<AiFunnelCounts> {
  const rows = await prisma.waInboxThread.groupBy({
    by: ["aiState"],
    where: { tenantId },
    _count: { _all: true },
  });

  const out = Object.fromEntries(STATES.map((k) => [k, 0])) as AiFunnelCounts;
  for (const r of rows) {
    const k = bucket(r.aiState);
    out[k] += r._count._all;
  }
  return out;
}
