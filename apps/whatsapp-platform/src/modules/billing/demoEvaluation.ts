/**
 * Helpers para posicionar o plano FREE como avaliação / demo premium (sem alterar limites nem enforcement).
 */

import { normalizePlan, type PlanKey } from "./plans";

export const FREE_EVALUATION_STALE_DAYS = 14;

export function isFreeEvaluationPlan(plan: string | null | undefined): boolean {
  return normalizePlan(plan) === "FREE";
}

/**
 * Aviso suave quando o tenant em avaliação existe há vários dias — só copy, sem bloqueio.
 */
export function freeEvaluationStaleMessage(
  plan: string | null | undefined,
  tenantCreatedAtIso: string | null | undefined,
  minDays = FREE_EVALUATION_STALE_DAYS
): string | null {
  if (!isFreeEvaluationPlan(plan) || !tenantCreatedAtIso?.trim()) return null;
  const created = new Date(tenantCreatedAtIso);
  if (Number.isNaN(created.getTime())) return null;
  const days = (Date.now() - created.getTime()) / 86_400_000;
  if (days < minDays) return null;
  return "Ambiente de avaliação ativo há algum tempo — recomendamos avançar para a operação completa com a nossa equipa.";
}

/** Linha de progresso explícita (contagem) para urgência natural na demo. */
export function formatFreeEvaluationUsageCounts(
  messagesUsed: number,
  messagesLimit: number | null | undefined,
  aiUsed: number,
  aiLimit: number | null | undefined
): string {
  const parts: string[] = [];
  if (messagesLimit != null && messagesLimit > 0) {
    parts.push(
      `Mensagens da avaliação: ${messagesUsed.toLocaleString("pt-BR")} de ${messagesLimit.toLocaleString("pt-BR")} neste período.`
    );
  }
  if (aiLimit != null && aiLimit > 0) {
    parts.push(`IA: ${aiUsed.toLocaleString("pt-BR")} de ${aiLimit.toLocaleString("pt-BR")}.`);
  }
  return parts.join(" ");
}

export function evaluationModeBadgeLabel(plan: string | null | undefined): string | null {
  return isFreeEvaluationPlan(plan) ? "Modo avaliação ativo" : null;
}

export function planKeyForDisplay(plan: string | null | undefined): PlanKey {
  return normalizePlan(plan);
}
