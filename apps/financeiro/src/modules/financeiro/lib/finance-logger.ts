/**
 * Logs estruturados para auditoria financeira (stdout → agregador em produção).
 */
export type FinanceLogEvent = {
  action:
    | "expense_created"
    | "payment_applied"
    | "payment_reversed"
    | "settlement_created"
    | "settlements_generated"
    | "settlement_completed"
    | "month_closed"
    | "settlement_reopened"
    | "settlement_finalized";
  userId: string;
  householdId: string;
  /** ISO8601 redundante com ts; útil para buscas em agregadores */
  timestamp?: string;
  settlementId?: string;
  accountId?: string;
  paymentId?: string;
  expenseId?: string;
  amount?: number;
  month?: string;
  meta?: Record<string, unknown>;
};

export function logFinanceEvent(ev: FinanceLogEvent): void {
  const ts = new Date().toISOString();
  const line = JSON.stringify({
    ts,
    timestamp: ts,
    service: "financeiro",
    ...ev,
  });
  if (process.env.NODE_ENV === "test") return;
  console.log(`[finance] ${line}`);
}
