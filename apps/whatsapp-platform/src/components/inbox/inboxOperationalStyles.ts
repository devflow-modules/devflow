import type { InboxSlaLevel } from "./inboxTypes";

/** Classes de badge SLA (alinhadas a `globals.css` — `df-badge-sla-*`). */
export const SLA_LEVEL_BADGE_CLASS: Record<InboxSlaLevel, string> = {
  low: "df-badge-sla-ok",
  medium: "df-badge-sla-medium",
  high: "df-badge-sla-high",
  critical: "df-badge-sla-critical",
};

/** Espera na lista — mesmo significado visual que no cabeçalho. */
export function slaWaitLabelClass(isCritical: boolean, isHigh: boolean): string {
  if (isCritical) return "df-inbox-sla-wait-critical";
  if (isHigh) return "df-inbox-sla-wait-high";
  return "df-inbox-sla-wait-muted";
}
