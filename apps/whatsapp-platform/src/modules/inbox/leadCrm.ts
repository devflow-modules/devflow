import { WaInboxThreadPriority } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import {
  resolveNextState,
  countInboundTextMessages,
  type AiState,
} from "@/modules/ai/conversationStateService";
import {
  mergeProspectData,
  parseProspectFromUnknown,
  type ProspectData,
} from "@/modules/inbox/prospectSales";

export type LeadData = {
  name?: string;
  interest?: string;
  budget?: string;
  urgency?: string;
  /** Prospecção comercial (DevFlow) — JSON em `lead_data`. */
  prospect?: ProspectData;
};

const PRICE_BUDGET_HINTS =
  /\b(?:pre[çc]o|preco|or[çc]amento|orcamento|quanto\s+custa|qual\s+(?:o\s+)?valor|valor\s+do|desconto|proposta)\b/i;

const URGENCY_HINTS =
  /\b(?:agora|hoje|urgente|urgência|urgencia|imediato|imediatamente|já\b|ja\b|urgentíssimo|urgentissimo)\b/i;

export type LeadScoreContext = {
  inboundTextCount: number;
  lastMessageText: string;
  projectedAiState: AiState;
};

/**
 * Pontuação CRM (MVP). Não recalcula sozinho — chamar só após inbound de texto novo.
 */
export function computeLeadScore(ctx: LeadScoreContext): number {
  let score = 0;
  if (ctx.inboundTextCount > 2) score += 10;

  const text = ctx.lastMessageText.toLowerCase();
  if (PRICE_BUDGET_HINTS.test(text)) score += 20;
  if (URGENCY_HINTS.test(text)) score += 30;

  if (ctx.projectedAiState === "negotiating") score += 15;
  if (ctx.projectedAiState === "support") score -= 10;

  return score;
}

export function extractLeadData(message: string): Partial<LeadData> {
  const t = message.trim();
  if (!t) return {};
  const lower = t.toLowerCase();
  const out: Partial<LeadData> = {};

  const nameMatch = t.match(
    /(?:me\s+chamo|chamo-me|sou\s+(?:o\s+|a\s+)?|meu\s+nome\s+é|nome\s*é)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'.-]{1,40})/i
  );
  if (nameMatch?.[1]) out.name = nameMatch[1].trim().replace(/\s+/g, " ");

  if (/\bquanto\s+custa\b|\bqual\s+(?:o\s+)?pre[çc]o\b/i.test(t)) {
    if (!out.interest) out.interest = "preço/orçamento";
    if (!out.budget) out.budget = "perguntou valores";
  }

  const interestMatch = t.match(
    /(?:^|[\s,.])(?:quero|preciso de|procuro|tenho interesse em)\s+([^.!\n?]{2,120})/i
  );
  if (interestMatch?.[1]) {
    const v = interestMatch[1].trim().replace(/\s+/g, " ");
    if (v.length >= 2) out.interest = v.slice(0, 200);
  }

  if (URGENCY_HINTS.test(lower)) {
    if (/\bhoje\b/i.test(lower)) out.urgency = "hoje";
    else if (!out.urgency) out.urgency = "urgente";
  }

  if (/\bpreciso\s+hoje\b/i.test(lower)) out.urgency = "hoje";

  return out;
}

export function mergeLeadData(
  existing: LeadData | null | undefined,
  patch: Partial<LeadData>
): LeadData {
  const base: LeadData = { ...(existing ?? {}) };
  for (const k of ["name", "interest", "budget", "urgency"] as const) {
    const v = patch[k]?.trim();
    if (v && !base[k]) base[k] = v;
  }
  if (patch.prospect && Object.keys(patch.prospect).length) {
    base.prospect = mergeProspectData(base.prospect, patch.prospect);
  }
  return base;
}

export function getConversationPriority(leadScore: number): WaInboxThreadPriority {
  if (leadScore > 50) return WaInboxThreadPriority.HIGH;
  if (leadScore >= 20) return WaInboxThreadPriority.MEDIUM;
  return WaInboxThreadPriority.LOW;
}

/** Parse seguro de `lead_data` (API + refresh inbound). */
export function parseLeadDataJson(raw: unknown): LeadData {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: LeadData = {};
  for (const k of ["name", "interest", "budget", "urgency"] as const) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  const prospect = parseProspectFromUnknown(o.prospect);
  if (prospect) out.prospect = prospect;
  return out;
}

/**
 * Recalcula score/dados/prioridade uma vez por mensagem inbound de texto.
 */
export async function refreshThreadLeadCrmAfterInbound(params: {
  tenantId: string;
  threadId: string;
  inboundText: string;
}): Promise<{ leadScore: number; priority: WaInboxThreadPriority; leadData: LeadData } | null> {
  const { tenantId, threadId, inboundText } = params;

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { aiState: true, leadData: true },
  });
  if (!thread) return null;

  const inboundTextCount = await countInboundTextMessages(tenantId, threadId);
  const projected = resolveNextState({
    previousState: thread.aiState,
    inboundTextCount,
    lastInboundText: inboundText,
  });

  const extracted = extractLeadData(inboundText);
  const merged = mergeLeadData(parseLeadDataJson(thread.leadData), extracted);

  const leadScore = computeLeadScore({
    inboundTextCount,
    lastMessageText: inboundText,
    projectedAiState: projected,
  });
  const priority = getConversationPriority(leadScore);

  await prisma.waInboxThread.update({
    where: { id: threadId },
    data: {
      leadScore,
      leadData: merged as object,
      priority,
    },
  });

  return { leadScore, priority, leadData: merged };
}
