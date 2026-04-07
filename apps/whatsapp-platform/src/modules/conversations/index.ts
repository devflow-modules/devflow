/**
 * Módulo conversations — Supabase (`conversations`).
 * @deprecated Não é fonte canónica em runtime; usar `wa_inbox_threads` + `whatsapp_phone_numbers`.
 * Ver `docs/whatsapp-platform/CANONICAL_MESSAGING.md`.
 */
export const CONVERSATIONS_MODULE = "conversations";
export {
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
