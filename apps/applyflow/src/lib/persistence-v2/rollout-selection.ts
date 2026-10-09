import type { ApplyFlowPersistenceEnv } from "./feature-flag";

/**
 * Server-only account selection for Persistence V2 rollout.
 * Never read this from NEXT_PUBLIC_* and never accept an account id from the client.
 */
export const APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS_ENV =
  "APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS";

const ACCOUNT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ApplyFlowRolloutParticipation = "selected" | "excluded" | "closed";

export type ApplyFlowRolloutSelection =
  | { ok: true; accountIds: ReadonlySet<string> }
  | { ok: false; reason: "absent" | "empty" | "invalid" };

/**
 * Parse the rollout allowlist.
 * Absent, empty, or any non-UUID token fails the whole selection closed.
 * The returned set contains lowercase ids and must not be logged.
 */
export function parseApplyFlowRolloutSelection(
  env: ApplyFlowPersistenceEnv = process.env,
): ApplyFlowRolloutSelection {
  const raw = env[APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS_ENV];
  if (typeof raw !== "string") return { ok: false, reason: "absent" };
  if (raw.trim() === "") return { ok: false, reason: "empty" };
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return { ok: false, reason: "empty" };
  if (!parts.every((part) => ACCOUNT_UUID.test(part))) return { ok: false, reason: "invalid" };
  return { ok: true, accountIds: new Set(parts.map((part) => part.toLowerCase())) };
}

/**
 * Classify one server-derived account id.
 * Invalid configuration is closed for every account, including ids that look selected.
 */
export function classifyApplyFlowAccountRollout(
  accountId: string,
  env: ApplyFlowPersistenceEnv = process.env,
): ApplyFlowRolloutParticipation {
  const selection = parseApplyFlowRolloutSelection(env);
  if (!selection.ok) return "closed";
  const id = accountId.trim().toLowerCase();
  if (!ACCOUNT_UUID.test(id)) return "excluded";
  return selection.accountIds.has(id) ? "selected" : "excluded";
}
