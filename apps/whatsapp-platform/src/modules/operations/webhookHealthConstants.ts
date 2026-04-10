/** Janela “ok” — último sucesso recente. */
export const WEBHOOK_OK_MAX_AGE_MS = 15 * 60 * 1000;

/** Janela “atenção” — sem eventos há mais tempo, mas ainda aceitável. */
export const WEBHOOK_ATTENTION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** Acima disto sem sucesso → erro operacional. */
export const WEBHOOK_STALE_ERROR_MS = 48 * 60 * 60 * 1000;
