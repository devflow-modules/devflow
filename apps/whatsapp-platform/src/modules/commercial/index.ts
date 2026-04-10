export {
  scheduleFollowUp,
  scheduleReactivation,
  evaluateCommercialPipelineAfterInbound,
  processFollowUps,
  scanIdleNegotiationsAndHighReactivations,
  detectRecoveryKeywords,
  humanAgentRepliedAfterLastInbound,
  COMMERCIAL_TASK_TYPES,
} from "./commercialAutomationService";
export type { ScheduleFollowUpContext } from "./commercialAutomationService";
export {
  FOLLOWUP_DELAY_HIGH_MS,
  FOLLOWUP_DELAY_MEDIUM_MS,
  MIN_COMMERCIAL_INTERVAL_MS,
  MAX_FOLLOWUP_RECOVERY_PER_THREAD,
} from "./commercialAutomationConstants";
export { getOpportunityMetrics, type OpportunityMetrics } from "./opportunityMetricsService";
