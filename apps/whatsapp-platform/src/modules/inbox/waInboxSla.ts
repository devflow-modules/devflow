/**
 * SLA operacional da inbox: apenas threads em `awaiting_agent` (pendência inbound real).
 * Limites em ms — alinhados com ORDER BY em `waInboxQueries` (duplicar valores lá com cuidado).
 */

export type SlaLevel = "low" | "medium" | "high" | "critical";

/** &lt; 5 min → low */
export const SLA_TIER_LOW_MAX_MS = 5 * 60 * 1000;
/** &lt; 15 min → medium */
export const SLA_TIER_MEDIUM_MAX_MS = 15 * 60 * 1000;
/** &lt; 30 min → high; ≥ → critical */
export const SLA_TIER_HIGH_MAX_MS = 30 * 60 * 1000;

export function computeSlaLevel(responseDelayMs: number | null | undefined): SlaLevel | null {
  if (responseDelayMs == null || responseDelayMs < 0) return null;
  if (responseDelayMs < SLA_TIER_LOW_MAX_MS) return "low";
  if (responseDelayMs < SLA_TIER_MEDIUM_MAX_MS) return "medium";
  if (responseDelayMs < SLA_TIER_HIGH_MAX_MS) return "high";
  return "critical";
}

/** Ordenação dentro do bucket awaiting_agent: crítico primeiro (4…1). */
export function slaLevelToSortRank(level: SlaLevel | null): number {
  if (!level) return 0;
  return { low: 1, medium: 2, high: 3, critical: 4 }[level];
}

export function computeResponseDelayMs(
  awaitingAgent: boolean,
  lastUnansweredInboundAt: Date | null | undefined,
  now: Date
): number | null {
  if (!awaitingAgent || !lastUnansweredInboundAt) return null;
  return Math.max(0, now.getTime() - lastUnansweredInboundAt.getTime());
}

/** Rótulo curto para tempo de espera (desde última inbound pendente). */
export function formatWaitDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h}h ${rest} min` : `${h}h`;
}

/** Variante compacta para listas (ex.: `12m`, `1h`, `2h30m`). */
export function formatCompactWaitDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h}h${rest}m` : `${h}h`;
}
