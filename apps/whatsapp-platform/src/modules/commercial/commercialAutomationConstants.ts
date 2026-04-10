/** Delays para agendamento de follow-up (ms) */
export const FOLLOWUP_DELAY_HIGH_MS = 5 * 60 * 1000;
export const FOLLOWUP_DELAY_MEDIUM_MS = 15 * 60 * 1000;
export const FOLLOWUP_DELAY_NEGOTIATING_IDLE_MS = 30 * 60 * 1000;
export const REACTIVATION_DELAY_AFTER_IDLE_MS = 24 * 60 * 60 * 1000;
/** Anti-spam: intervalo mínimo entre envios comerciais automáticos */
export const MIN_COMMERCIAL_INTERVAL_MS = 10 * 60 * 1000;
/** Máximo de follow-up + recuperação por conversa (tipos followup e recovery) */
export const MAX_FOLLOWUP_RECOVERY_PER_THREAD = 2;
/** Máximo de reativações executadas por conversa numa janela de 24h */
export const MAX_REACTIVATIONS_PER_24H = 1;
/** Atraso antes de executar recuperação após detecção */
export const RECOVERY_SCHEDULE_DELAY_MS = 2 * 60 * 1000;

export const COMMERCIAL_TASK_TYPES = {
  FOLLOWUP: "followup",
  REACTIVATION: "reactivation",
  RECOVERY: "recovery",
} as const;
