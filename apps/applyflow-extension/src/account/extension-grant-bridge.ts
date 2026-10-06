import origins from "../../extension-origins.json";

export const APPLYFLOW_EXTENSION_ID = origins.extensionId;
export const EXTENSION_GRANT_STORAGE_KEY = "applyflow.extension.grant";

export type ExtensionGrantMessage =
  | { type: "APPLYFLOW_BIND_GRANT"; accountId: string; expiresAt: string; token: string }
  | { type: "APPLYFLOW_CLEAR_GRANT" }
  | { type: "APPLYFLOW_ACCOUNT_STATUS" };

export type StoredExtensionGrant = {
  accountId: string;
  expiresAt: string;
  token: string;
  origin: string;
};

export function extensionOriginsForTarget(target: "local" | "production"): readonly string[] {
  return target === "production" ? origins.productionOrigins : origins.localOrigins;
}

export function acceptExternalGrant(input: {
  message: unknown;
  senderUrl: string | undefined;
  allowedOrigins: readonly string[];
  now?: number;
}): { ok: true; grant: StoredExtensionGrant } | { ok: false; reason: "rejected" } {
  if (!input.message || typeof input.message !== "object") return { ok: false, reason: "rejected" };
  const message = input.message as Partial<ExtensionGrantMessage>;
  if (message.type !== "APPLYFLOW_BIND_GRANT") return { ok: false, reason: "rejected" };
  if (!input.senderUrl) return { ok: false, reason: "rejected" };
  let origin: string;
  try {
    origin = new URL(input.senderUrl).origin;
  } catch {
    return { ok: false, reason: "rejected" };
  }
  if (!input.allowedOrigins.includes(origin)) return { ok: false, reason: "rejected" };
  if (typeof message.accountId !== "string" || message.accountId.length < 8) return { ok: false, reason: "rejected" };
  if (typeof message.token !== "string" || message.token.length < 32) return { ok: false, reason: "rejected" };
  if (typeof message.expiresAt !== "string") return { ok: false, reason: "rejected" };
  const expiresAt = Date.parse(message.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= (input.now ?? Date.now())) return { ok: false, reason: "rejected" };
  return {
    ok: true,
    grant: { accountId: message.accountId, expiresAt: message.expiresAt, token: message.token, origin },
  };
}

export function replaceStoredGrant(
  previous: StoredExtensionGrant | null,
  next: StoredExtensionGrant,
): StoredExtensionGrant {
  if (previous && previous.accountId !== next.accountId) return next;
  return next;
}

export function extensionAccountStatus(
  grant: StoredExtensionGrant | null,
  now = Date.now(),
): { signedIn: false; accountId: null } | { signedIn: true; accountId: string } {
  if (!grant) return { signedIn: false, accountId: null };
  if (Date.parse(grant.expiresAt) <= now) return { signedIn: false, accountId: null };
  return { signedIn: true, accountId: grant.accountId };
}
