/**
 * Contadores em memória (processo). Úteis para logs de health e debug em produção sem dependências extra.
 */

const counts: Record<string, number> = {
  messages_sent: 0,
  messages_received: 0,
  threads_opened: 0,
  threads_closed: 0,
  errors: 0,
  webhook_posts: 0,
  webhook_pipeline_skipped_duplicate: 0,
  ai_auto_reply_started: 0,
  ai_auto_reply_completed: 0,
  ai_auto_reply_failed: 0,
  billing_enforcement_blocked: 0,
  feature_gate_blocked: 0,
  outbound_dispatch: 0,
};

export function bumpMetric(name: keyof typeof counts, delta = 1): void {
  counts[name] = (counts[name] ?? 0) + delta;
}

export function getMetricsSnapshot(): Readonly<Record<string, number>> {
  return { ...counts };
}
