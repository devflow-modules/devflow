/**
 * Classifica regras de automação que exigem ADVANCED_AUTOMATION (Pro+), alinhado à matriz de capacidades.
 * Starter: AUTOMATION básica; Pro+: fluxos mais ricos.
 */

const ADVANCED_TRIGGERS = new Set<string>(["TIME_ELAPSED"]);

const ADVANCED_ACTION_TYPES = new Set<string>(["triggerAIResponse", "notify"]);

const ADVANCED_CONDITION_OPERATORS = new Set<string>(["timeSinceLastMessage_gt"]);

export type RuleFeatureInput = {
  triggerType: string;
  conditions: Array<{ operator: string }>;
  actions: Array<{ type: string }>;
};

export function ruleRequiresAdvancedAutomation(rule: RuleFeatureInput): boolean {
  if (ADVANCED_TRIGGERS.has(rule.triggerType)) return true;
  for (const c of rule.conditions) {
    if (ADVANCED_CONDITION_OPERATORS.has(c.operator)) return true;
  }
  for (const a of rule.actions) {
    if (ADVANCED_ACTION_TYPES.has(a.type)) return true;
  }
  return false;
}
