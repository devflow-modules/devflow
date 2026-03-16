/**
 * Logger de eventos do domínio financeiro.
 * Suporta contexto opcional (traceId, requestId, serviceName) para rastreabilidade.
 * Preparado para integração futura com Sentry, Datadog ou OpenTelemetry.
 */

export type FinanceLogLevel = "info" | "warn" | "error";

export type FinanceLogContext = {
  traceId?: string;
  requestId?: string;
  serviceName?: string;
};

export type FinanceEventName =
  | "finance.expense.created"
  | "finance.expense.updated"
  | "finance.expense.deleted"
  | "finance.income.created"
  | "finance.income.updated"
  | "finance.income.deleted"
  | "finance.rule.created"
  | "finance.rule.updated"
  | "finance.rule.deleted"
  | "finance.source.created"
  | "finance.source.updated"
  | "finance.source.deleted"
  | "finance.household.created"
  | "finance.household.transfer"
  | "finance.invite.sent"
  | "finance.invite.revoked"
  | "finance.invite.accepted"
  | "finance.member.removed"
  | "finance.dashboard.viewed"
  | "finance.error";

export type FinanceLogPayload = Record<string, unknown> & {
  householdId?: string;
  userId?: string;
  entityId?: string;
  message?: string;
};

let logContext: FinanceLogContext = {};

function buildEntry(
  level: FinanceLogLevel,
  event: FinanceEventName | string,
  payload?: FinanceLogPayload
): Record<string, unknown> {
  return {
    module: "finance",
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(logContext.traceId && { traceId: logContext.traceId }),
    ...(logContext.requestId && { requestId: logContext.requestId }),
    ...(logContext.serviceName && { serviceName: logContext.serviceName }),
    ...payload,
  };
}

function emit(level: FinanceLogLevel, event: FinanceEventName | string, payload?: FinanceLogPayload) {
  const entry = buildEntry(level, event, payload);
  if (level === "error") {
    console.error("[finance]", JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn("[finance]", JSON.stringify(entry));
  } else {
    console.info("[finance]", JSON.stringify(entry));
  }
}

export const financeLogger = {
  info(event: FinanceEventName | string, payload?: FinanceLogPayload): void {
    emit("info", event, payload);
  },

  warn(event: FinanceEventName | string, payload?: FinanceLogPayload): void {
    emit("warn", event, payload);
  },

  error(event: FinanceEventName | string, payload?: FinanceLogPayload): void {
    emit("error", event, payload);
  },

  setContext(ctx: FinanceLogContext): void {
    logContext = { ...logContext, ...ctx };
  },

  clearContext(): void {
    logContext = {};
  },

  getContext(): FinanceLogContext {
    return { ...logContext };
  },
};
