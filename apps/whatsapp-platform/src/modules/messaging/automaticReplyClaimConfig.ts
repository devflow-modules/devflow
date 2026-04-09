/**
 * TTL de claims de resposta automática (ms). Default 120s se env inválido ou ausente.
 */
const DEFAULT_MS = 120_000;
const MIN_MS = 10_000;
const MAX_MS = 3_600_000;

function parseTtlMs(raw: string | undefined): number {
  if (raw == null || raw.trim() === "") return DEFAULT_MS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < MIN_MS) return DEFAULT_MS;
  return Math.min(n, MAX_MS);
}

export function getWaAutoReplyClaimTtlMs(): number {
  return parseTtlMs(
    typeof process !== "undefined" ? process.env.WA_AUTO_REPLY_CLAIM_TTL_MS : undefined
  );
}
