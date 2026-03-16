/**
 * Módulo messaging — persistência de mensagens, vínculo com conversas e metadados.
 */
export const MESSAGING_MODULE = "messaging";
export {
  insertMessage,
  countMessagesLast24h,
  listMessagesByConversation,
  getLastMessageForConversationIds,
} from "./messagesRepository";
export type { InsertMessageInput } from "./messagesRepository";
export { insertWebhookLog } from "./webhookLogsRepository";
export { sendReplyAndPersist } from "./sendMessageService";
export { processInboundMessage, persistWebhookLog } from "./webhookProcessingService";
