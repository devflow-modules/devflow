/**
 * Módulo messaging — envio Cloud API + persistência canónica em wa_inbox_*.
 * Contagens e métricas: `waInboxMessageStats` (Prisma).
 */
export const MESSAGING_MODULE = "messaging";

export {
  listMessagesByConversation,
  listMessagesInRange,
  getLastMessageForConversationIds,
} from "./messagesRepository";

export { insertWebhookLog, persistWebhookLog } from "./webhookLogsRepository";
export { countMessagesLast24h } from "./waInboxMessageStats";
export { sendReplyAndPersist, sendWebhookAutoReply } from "./sendMessageService";
export type {
  SendReplyInput,
  WebhookAutoReplyResult,
} from "./sendMessageService";
export type {
  AutomaticOutboundTriggerContext,
  AutomaticReplyAbortReason,
} from "./automaticReplyGuard";
export { getWaAutoReplyClaimTtlMs } from "./automaticReplyClaimConfig";
export {
  getWaAutoReplyClaimMetricsSnapshot,
  resetWaAutoReplyClaimMetricsForTests,
} from "./automaticReplyClaimInstrumentation";
export {
  expirePendingClaimsPastTtl,
  attemptRepairClaimFromOutboundEvidence,
  runAutoReplyClaimReconciliationJob,
  listStaleClaimsForTenant,
} from "./automaticReplyClaimReconciliationService";
export { listWaAutoReplyClaimsForAdmin } from "./automaticReplyClaimDiagnosticsService";
export {
  processInboundMessage,
  prepareInboundConversation,
  processLegacyInboundAutoReply,
} from "./webhookProcessingService";
