export {
  dispatchEvent,
  dispatchMessageInbound,
  dispatchMessageOutbound,
  dispatchConversationCreated,
  dispatchStatusChanged,
  dispatchTagAdded,
  dispatchTagRemoved,
  dispatchTimeElapsed,
} from "./automation.engine";
export { seedDefaultAutomationRules } from "./defaultRules.seed";
export { runTimeElapsedRulesBatch } from "./timeElapsedRunner";
export { normalizeTriggerType } from "./triggerNormalize";
export { evaluateRules, evaluateConditions, getActiveRulesByTrigger } from "./rule.engine";
export { executeAction, canExecuteMore } from "./action.executor";
export { executePlaybook, getPlaybook } from "./playbook.engine";
export {
  classifyIntent,
  detectUrgency,
  suggestAction,
} from "./aiDecision.service";
export type { AiClassificationResult } from "./aiDecision.service";
export type {
  AutomationTriggerType,
  AutomationEvent,
  AutomationContext,
  AutomationRuleRow,
  Condition,
  Action,
  PlaybookStep,
  PlaybookRow,
} from "./automation.types";
