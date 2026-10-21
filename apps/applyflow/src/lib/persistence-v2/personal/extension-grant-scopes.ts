/**
 * Explicit extension grant scopes.
 * Legacy mint set preserves profile / jobs / applications only.
 * Contacts require a reconnect that presents and records contacts scopes.
 */

export const EXTENSION_GRANT_SCOPE_VALUES = [
  "profile:read",
  "profile:write",
  "jobs:read",
  "jobs:write",
  "applications:read",
  "applications:write",
  "contacts:read",
  "contacts:write",
] as const;

export type ExtensionGrantScope = (typeof EXTENSION_GRANT_SCOPE_VALUES)[number];

/** Scopes present on grants minted before contacts existed (migration backfill). */
export const EXTENSION_GRANT_LEGACY_SCOPES: readonly ExtensionGrantScope[] = [
  "profile:read",
  "profile:write",
  "jobs:read",
  "jobs:write",
  "applications:read",
  "applications:write",
] as const;

/** Full catalog presented at reconnect (user must confirm). */
export const EXTENSION_GRANT_REQUESTABLE_SCOPES: readonly ExtensionGrantScope[] = [
  ...EXTENSION_GRANT_LEGACY_SCOPES,
  "contacts:read",
  "contacts:write",
] as const;

export const EXTENSION_GRANT_SCOPE_LABELS: Record<ExtensionGrantScope, string> = {
  "profile:read": "Ler currículo da conta",
  "profile:write": "Actualizar currículo da conta",
  "jobs:read": "Ler vagas da conta",
  "jobs:write": "Registar vagas na conta",
  "applications:read": "Ler candidaturas da conta",
  "applications:write": "Registar e actualizar candidaturas",
  "contacts:read": "Ler contactos e interações",
  "contacts:write": "Criar e editar contactos e interações",
};

const SCOPE_SET = new Set<string>(EXTENSION_GRANT_SCOPE_VALUES);

export function isExtensionGrantScope(value: unknown): value is ExtensionGrantScope {
  return typeof value === "string" && SCOPE_SET.has(value);
}

export function parseExtensionGrantScopes(raw: unknown): ExtensionGrantScope[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ExtensionGrantScope[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isExtensionGrantScope(item)) return null;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out.length > 0 ? out : null;
}

export function grantHasScope(
  scopes: readonly string[] | null | undefined,
  required: ExtensionGrantScope,
): boolean {
  if (!scopes || scopes.length === 0) return false;
  return scopes.includes(required);
}
