/**
 * @devflow/ai-core
 * Adaptadores LLM, classificação de intent, formatação, segurança e fallback.
 * Genérico; prompts específicos ficam no app.
 */

export const AI_CORE_VERSION = "0.0.1";

export * from "./types";
export * from "./classifyIntent";
export * from "./formatResponse";
export * from "./fallback";
export * from "./promptBuilder";
