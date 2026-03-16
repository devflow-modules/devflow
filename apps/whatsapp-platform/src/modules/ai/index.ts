/**
 * Módulo ai — orquestração e prompts específicos do produto.
 * Usa @devflow/ai-core para LLM, intent e formatação.
 */
export const AI_MODULE = "ai";
export { generateAiReply } from "./aiOrchestrator";
export type { GenerateReplyInput } from "./aiOrchestrator";
export { getReplyForMessage, parseMessage, MESSAGES } from "./ruleBasedReplies";
export type { MessageKey } from "./ruleBasedReplies";
