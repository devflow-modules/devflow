/**
 * Account binding for the extension.
 * Presents an opaque bearer minted by the logged-in ApplyFlow page.
 * Does not read document.cookie, chrome.cookies, or HttpOnly session cookies.
 * Does not submit applications.
 */

export const EXTENSION_LEGACY_PROFILE_KEY = "applyflow.profile" as const;

export function extensionAccountProfileKey(accountId: string): string {
  return `applyflow.profile.account.${accountId}`;
}

export type ExtensionAccountResult =
  | { ok: true; accountId: string; scopes: string[] }
  | { ok: false; reason: "signed_out" | "misconfigured" };

export async function readExtensionAccount(input: {
  origin: string;
  token: string | null;
  fetchImpl?: typeof fetch;
}): Promise<ExtensionAccountResult> {
  if (!input.origin || !input.token) return { ok: false, reason: "signed_out" };
  let url: URL;
  try {
    url = new URL("/api/applyflow/v2/extension/session", input.origin);
  } catch {
    return { ok: false, reason: "misconfigured" };
  }
  const response = await (input.fetchImpl ?? fetch)(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${input.token}`, Accept: "application/json" },
  });
  if (response.status === 401) return { ok: false, reason: "signed_out" };
  if (!response.ok) return { ok: false, reason: "misconfigured" };
  const body = (await response.json()) as { accountId?: string; scopes?: unknown };
  if (!body.accountId) return { ok: false, reason: "signed_out" };
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter((item): item is string => typeof item === "string")
    : [];
  return { ok: true, accountId: body.accountId, scopes };
}

export function selectExtensionProfileKey(input: {
  accountId: string | null;
  legacyKey?: string;
}): string | null {
  if (!input.accountId) return null;
  const legacy = input.legacyKey ?? EXTENSION_LEGACY_PROFILE_KEY;
  const scoped = extensionAccountProfileKey(input.accountId);
  if (scoped === legacy) return null;
  return scoped;
}
