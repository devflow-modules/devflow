/**
 * @devflow/whatsapp-core
 * Tipos, normalização de webhook, adapter Cloud API, retry e status.
 * Sem lógica por tenant.
 */

export const WHATSAPP_CORE_VERSION = "0.0.1";

export * from "./types";
export * from "./normalize";
export * from "./retry";
export * from "./adapter";
export * from "./status";
