import type { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "./auth";
import { checkFinancialRateLimit } from "./financialRateLimit";
import { logFinanceEvent } from "@/modules/financeiro/lib/finance-logger";

export type FinancialCtx = AuthContext;

/** Rate limit + opcional log após mutação financeira bem-sucedida. */
export function guardFinancialMutation(userId: string): NextResponse | null {
  return checkFinancialRateLimit(userId);
}

export { logFinanceEvent };
