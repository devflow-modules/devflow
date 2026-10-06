/**
 * In-memory fence for the signed-in ApplyFlow account.
 * Legacy localStorage keys are never deleted and never copied onto the next account.
 */

export type PersonalClientAuthority = "local" | "cloud_read" | "cloud_write" | "cloud_paused";

type PersonalClientScope = {
  accountId: string | null;
  generation: number;
  authority: PersonalClientAuthority;
};

let scope: PersonalClientScope = {
  accountId: null,
  generation: 0,
  authority: "local",
};

const inflight = new Map<number, Set<AbortController>>();
const contactVersions = new Map<string, number>();
const responseVersions = new Map<string, number>();

function abortAllInflight(): void {
  for (const controllers of inflight.values()) {
    for (const controller of controllers) controller.abort();
  }
  inflight.clear();
}

export function rememberContactVersion(contactId: string, version: number): void {
  if (!scope.accountId) return;
  contactVersions.set(`${scope.accountId}:${contactId}`, version);
}

export function rememberedContactVersion(contactId: string): number | undefined {
  if (!scope.accountId) return undefined;
  return contactVersions.get(`${scope.accountId}:${contactId}`);
}

export function rememberResponseVersion(responseId: string, version: number): void {
  if (!scope.accountId) return;
  responseVersions.set(`${scope.accountId}:${responseId}`, version);
}

export function rememberedResponseVersions(): Record<string, number> {
  if (!scope.accountId) return {};
  const prefix = `${scope.accountId}:`;
  const versions: Record<string, number> = {};
  for (const [key, version] of responseVersions) {
    if (key.startsWith(prefix)) versions[key.slice(prefix.length)] = version;
  }
  return versions;
}

export function currentPersonalClientScope(): PersonalClientScope {
  return { ...scope };
}

export function acceptPersonalResult<T>(generation: number, value: T): T | null {
  if (isStalePersonalGeneration(generation)) return null;
  return value;
}

export function bindPersonalClientScope(next: {
  accountId: string | null;
  authority: PersonalClientAuthority;
}): number {
  const changed = scope.accountId !== next.accountId || scope.authority !== next.authority;
  if (!changed) return scope.generation;
  abortAllInflight();
  contactVersions.clear();
  responseVersions.clear();
  scope = {
    accountId: next.accountId,
    generation: scope.generation + 1,
    authority: next.authority,
  };
  return scope.generation;
}

export function resetPersonalClientScopeForTests(): void {
  abortAllInflight();
  contactVersions.clear();
  responseVersions.clear();
  scope = { accountId: null, generation: 0, authority: "local" };
}

export function personalStorageKey(legacyKey: string): string {
  if (scope.authority === "local" || !scope.accountId) return legacyKey;
  return `${legacyKey}::${scope.accountId}`;
}

export function personalLocalWritesAllowed(): boolean {
  return scope.authority === "local";
}

export function beginPersonalRequest(): { generation: number; signal: AbortSignal } {
  const controller = new AbortController();
  let controllers = inflight.get(scope.generation);
  if (!controllers) {
    controllers = new Set();
    inflight.set(scope.generation, controllers);
  }
  controllers.add(controller);
  return { generation: scope.generation, signal: controller.signal };
}

export function isStalePersonalGeneration(generation: number): boolean {
  return generation !== scope.generation;
}

export function writeAccountScopedCache(legacyKey: string, value: string): void {
  const current = currentPersonalClientScope();
  if (current.authority === "local" || !current.accountId) return;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${legacyKey}::${current.accountId}`, value);
}
