/**
 * Mapeia nomes de tags (WaInboxTag.name) para estágios do funil gerencial v1.
 * Tags podem ser PT/EN; uma thread com várias tags de funil usa o estágio mais avançado.
 */

export type FunnelStageKey = "lead" | "qualified" | "proposal" | "followUp" | "closed" | "lost";

/** Ordem crescente: maior = mais avançado no pipeline (para desempate). */
export const FUNNEL_STAGE_RANK: Record<FunnelStageKey, number> = {
  lead: 1,
  qualified: 2,
  proposal: 3,
  followUp: 4,
  closed: 5,
  lost: 6,
};

const ALIASES: Record<FunnelStageKey, readonly string[]> = {
  lead: ["lead", "novo", "prospect", "topo"],
  qualified: ["qualified", "qualificado", "qualificação", "qualificacao", "mql", "sql"],
  proposal: ["proposal", "proposta", "orçamento", "orcamento", "quote"],
  followUp: ["follow", "follow-up", "followup", "acompanhamento", "retorno"],
  closed: ["closed", "fechado", "ganho", "won", "venda"],
  lost: ["lost", "perdido", "descartado", "disqualified"],
};

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Resolve estágio a partir do nome da tag, ou null se não for estágio de funil. */
export function funnelStageFromTagName(tagName: string): FunnelStageKey | null {
  const n = normalize(tagName);
  for (const [stage, names] of Object.entries(ALIASES) as [FunnelStageKey, readonly string[]][]) {
    for (const alias of names) {
      if (n === normalize(alias) || n.includes(normalize(alias))) {
        return stage;
      }
    }
  }
  return null;
}

/** Para uma lista de nomes de tags numa thread, devolve o estágio mais avançado (maior rank). */
export function pickHighestFunnelStage(tagNames: string[]): FunnelStageKey | null {
  let best: FunnelStageKey | null = null;
  let bestRank = 0;
  for (const name of tagNames) {
    const stage = funnelStageFromTagName(name);
    if (!stage) continue;
    const r = FUNNEL_STAGE_RANK[stage];
    if (r > bestRank) {
      bestRank = r;
      best = stage;
    }
  }
  return best;
}
