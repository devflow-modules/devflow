/**
 * Módulo conversations — ciclo de vida, atribuição e estado.
 */
export const CONVERSATIONS_MODULE = "conversations";
export {
  findOrCreateConversation,
  updateConversationStatus,
  touchConversationLastMessage,
  getConversationById,
  listConversations,
  listConversationsByDateRange,
  countConversations,
  setConversationQueue,
  assignConversationToAgent,
  listConversationsByStatus,
} from "./conversationsRepository";
