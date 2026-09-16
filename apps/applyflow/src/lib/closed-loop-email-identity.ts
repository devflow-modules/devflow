import type { InboundEmail } from "@devflow/applyflow-core";

const ACCOUNT_SCOPE_PATTERN = /^[a-f0-9]{32}$/;

export function isClosedLoopAccountScope(value: string | undefined): value is string {
  return Boolean(value && ACCOUNT_SCOPE_PATTERN.test(value));
}

export function resolveClosedLoopInboundEmailId(input: {
  scopedId: string;
  legacyId?: string;
  accountScope?: string;
  existingEmailIds: readonly string[];
  legacyOwnerScope?: string;
}): string {
  if (
    input.legacyId &&
    input.accountScope &&
    input.legacyOwnerScope &&
    input.accountScope === input.legacyOwnerScope &&
    input.existingEmailIds.includes(input.legacyId)
  ) {
    return input.legacyId;
  }
  return input.scopedId;
}

export function bindLegacyClosedLoopAccountScope(input: {
  existingEmailIds: readonly string[];
  currentOwnerScope?: string;
  selectedAccountScope?: string;
  explicitConfirmation?: boolean;
}): string | undefined {
  if (input.currentOwnerScope) return input.currentOwnerScope;
  if (!input.explicitConfirmation) return undefined;
  if (input.existingEmailIds.length === 0) return undefined;
  if (!isClosedLoopAccountScope(input.selectedAccountScope)) return undefined;
  return input.selectedAccountScope;
}

export function confirmLegacyClosedLoopAccountOwnership(input: {
  existingEmailIds: readonly string[];
  currentOwnerScope?: string;
  selectedAccountScope: string;
}):
  | { ok: true; legacyOwnerScope: string }
  | { ok: false; error: "already_bound" | "missing_detections" | "invalid_scope" } {
  if (!isClosedLoopAccountScope(input.selectedAccountScope)) {
    return { ok: false, error: "invalid_scope" };
  }
  if (input.currentOwnerScope) {
    return input.currentOwnerScope === input.selectedAccountScope
      ? { ok: true, legacyOwnerScope: input.currentOwnerScope }
      : { ok: false, error: "already_bound" };
  }
  if (input.existingEmailIds.length === 0) {
    return { ok: false, error: "missing_detections" };
  }
  return { ok: true, legacyOwnerScope: input.selectedAccountScope };
}

export function applyClosedLoopInboundIdentity(input: {
  emails: readonly InboundEmail[];
  accountScopes?: readonly string[];
  existingEmailIds: readonly string[];
  legacyOwnerScope?: string;
  selectedAccountScope?: string;
  explicitConfirmation?: boolean;
}): { emails: InboundEmail[]; legacyOwnerScope?: string } {
  const legacyOwnerScope = bindLegacyClosedLoopAccountScope({
    existingEmailIds: input.existingEmailIds,
    currentOwnerScope: input.legacyOwnerScope,
    selectedAccountScope: input.selectedAccountScope,
    explicitConfirmation: input.explicitConfirmation,
  });
  const emails = input.emails.map((email) => {
    const id = resolveClosedLoopInboundEmailId({
      scopedId: email.id,
      legacyId: email.legacyId,
      accountScope: email.accountScope,
      existingEmailIds: input.existingEmailIds,
      legacyOwnerScope,
    });
    return {
      ...email,
      id,
    };
  });
  return { emails, ...(legacyOwnerScope ? { legacyOwnerScope } : {}) };
}
