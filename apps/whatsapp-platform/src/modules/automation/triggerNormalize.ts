/** Mapeia aliases v1 → tipos canónicos armazenados em `wa_automation_rules.trigger_type`. */

const TO_CANONICAL: Record<string, string> = {
  message_received: "MESSAGE_INBOUND",
  MESSAGE_INBOUND: "MESSAGE_INBOUND",
  time_elapsed: "TIME_ELAPSED",
  TIME_ELAPSED: "TIME_ELAPSED",
};

export function normalizeTriggerType(triggerType: string): string {
  const t = triggerType.trim();
  if (TO_CANONICAL[t] !== undefined) return TO_CANONICAL[t];
  const lower = t.toLowerCase();
  if (TO_CANONICAL[lower] !== undefined) return TO_CANONICAL[lower]!;
  return t;
}
