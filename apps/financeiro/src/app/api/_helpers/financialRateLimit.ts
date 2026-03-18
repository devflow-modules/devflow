import { NextResponse } from "next/server";
import { buildErrorPayload } from "@/modules/financeiro/lib/utils/response";

const WINDOW_MS = 60_000;
const MAX = 20;

const buckets = new Map<string, number[]>();

function prune(userId: string): number[] {
  const now = Date.now();
  const arr = buckets.get(userId) ?? [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  buckets.set(userId, fresh);
  return fresh;
}

/**
 * 20 req/min por usuário em mutações financeiras sensíveis.
 * Em múltiplas instâncias serverless use Redis/Upstash (este é in-memory por processo).
 */
export function checkFinancialRateLimit(userId: string): NextResponse | null {
  const timestamps = prune(userId);
  if (timestamps.length >= MAX) {
    return NextResponse.json(
      buildErrorPayload(
        "Muitas requisições. Aguarde um minuto.",
        "RATE_LIMIT_EXCEEDED"
      ),
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
  timestamps.push(Date.now());
  buckets.set(userId, timestamps);
  return null;
}
