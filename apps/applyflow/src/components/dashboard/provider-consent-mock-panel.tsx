"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ProviderConnectionActionResult } from "@devflow/career-sync";
import { useState } from "react";
import {
  formatProviderConsentActionReasons,
  formatProviderConsentActionSnapshotStatus,
  formatProviderConsentActionStatus,
  PROVIDER_CONSENT_PREVIEW_REQUESTED_AT,
  runProviderConsentActionMock,
} from "./provider-consent-action-mock";
import {
  PROVIDER_CONSENT_MOCK_ACTIONS,
  PROVIDER_CONSENT_MOCK_BADGE,
  PROVIDER_CONSENT_MOCK_BOUNDARIES,
  PROVIDER_CONSENT_MOCK_DESCRIPTION,
  PROVIDER_CONSENT_MOCK_RUNTIME,
  PROVIDER_CONSENT_MOCK_TITLE,
} from "./provider-consent-mock-content";
import {
  formatProviderCapabilityYesNo,
  formatProviderConnectionStatusLabel,
  getProviderConsentMockCapabilities,
  getProviderConsentMockWarnings,
  PROVIDER_CONSENT_MOCK_PROVIDER_LABELS,
  PROVIDER_CONSENT_MOCK_SIGNAL_HINTS,
  providerConsentMockConnections,
} from "./provider-consent-mock-data";

/**
 * Read-only mock panel for future provider consent flow.
 * Simulates connect/revoke/delete actions locally via @devflow/career-sync action mock.
 * Does not connect providers, request OAuth, store tokens, or fetch Gmail/Calendar data.
 */

export function ProviderConsentMockActionResultPreview({
  result,
}: {
  result: ProviderConnectionActionResult;
}) {
  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-cyan-500/25 bg-cyan-950/15"
      data-testid="provider-consent-mock-action-result"
    >
      <div className="space-y-2 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <p className="text-xs font-semibold text-cyan-100/95">Mock action result</p>
        <p>
          Status:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderConsentActionStatus(result.status)}
          </span>
        </p>
        <p>
          Runtime disabled:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderCapabilityYesNo(result.runtimeDisabled)}
          </span>
        </p>
        <p>
          OAuth started:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderCapabilityYesNo(result.canStartOAuth)}
          </span>
        </p>
        <p>
          Provider call:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderCapabilityYesNo(result.canCallProvider)}
          </span>
        </p>
        <p>
          Token stored:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderCapabilityYesNo(result.canStoreToken)}
          </span>
        </p>
        <p>
          Provider data persisted:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderCapabilityYesNo(result.canPersistProviderData)}
          </span>
        </p>
        <p>
          Snapshot:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderConsentActionSnapshotStatus(result)}
          </span>
        </p>
        <p>
          Derived data deletion available:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderCapabilityYesNo(result.connectionSnapshot.capability.canDeleteDerivedData)}
          </span>
        </p>
        <p>
          Reason:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderConsentActionReasons(result)}
          </span>
        </p>
      </div>
    </ApplyFlowCard>
  );
}

export function ProviderConsentMockPanel() {
  const [lastActionResult, setLastActionResult] = useState<ProviderConnectionActionResult | null>(
    null,
  );

  return (
    <ApplyFlowCard variant="muted" padding="md" className="border border-[color:var(--af-border-strong)]/80">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[color:var(--af-text)]">{PROVIDER_CONSENT_MOCK_TITLE}</h3>
            <ApplyFlowBadge tone="warning">{PROVIDER_CONSENT_MOCK_BADGE}</ApplyFlowBadge>
            <p className="max-w-2xl text-xs leading-relaxed text-[color:var(--af-text-muted)]">
              {PROVIDER_CONSENT_MOCK_DESCRIPTION}
            </p>
          </div>
          <p className="shrink-0 text-[11px] text-[color:var(--af-text-muted)]">
            Runtime: <span className="font-medium text-[color:var(--af-text)]">Sandbox</span> /{" "}
            <span className="font-medium text-[color:var(--af-text)]">{PROVIDER_CONSENT_MOCK_RUNTIME}</span>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {providerConsentMockConnections.map((snapshot) => {
            const label = PROVIDER_CONSENT_MOCK_PROVIDER_LABELS[snapshot.provider];
            const hints = PROVIDER_CONSENT_MOCK_SIGNAL_HINTS[snapshot.provider];
            const capabilities = getProviderConsentMockCapabilities(snapshot);
            const warnings = getProviderConsentMockWarnings(snapshot);
            const scopesPreview =
              snapshot.scopes.length > 0 ? snapshot.scopes.join(", ") : "No scopes (not connected)";

            return (
              <ApplyFlowCard
                key={snapshot.provider}
                variant="default"
                padding="sm"
                className="bg-[color:var(--af-surface)]/60"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-[color:var(--af-text)]">{label}</h4>
                    <ApplyFlowBadge tone="neutral">
                      Status: {formatProviderConnectionStatusLabel(snapshot.status)}
                    </ApplyFlowBadge>
                  </div>
                  <p className="text-[11px] text-[color:var(--af-text-muted)]">
                    Runtime:{" "}
                    <span className="capitalize text-[color:var(--af-text)]">{snapshot.runtime}</span> /{" "}
                    <span className="text-[color:var(--af-text)]">{PROVIDER_CONSENT_MOCK_RUNTIME}</span>
                  </p>
                  <p className="text-[11px] leading-snug text-[color:var(--af-text-muted)]">
                    <span className="font-medium text-cyan-200/90">Scopes preview:</span> {scopesPreview}
                  </p>
                  <p className="text-[11px] leading-snug text-[color:var(--af-text-muted)]">
                    <span className="font-medium text-emerald-200/90">Allowed derived signals:</span>{" "}
                    {hints.allowedSignals}
                  </p>
                  <p className="text-[11px] leading-snug text-[color:var(--af-text-muted)]">
                    <span className="font-medium text-amber-200/90">Never stored:</span> {hints.neverStored}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[color:var(--af-text-muted)]">
                    <p>
                      Can sync:{" "}
                      <span className="font-medium text-[color:var(--af-text)]">
                        {formatProviderCapabilityYesNo(capabilities.canSync)}
                      </span>
                    </p>
                    <p>
                      Can revoke:{" "}
                      <span className="font-medium text-[color:var(--af-text)]">
                        {formatProviderCapabilityYesNo(capabilities.canRevoke)}
                      </span>
                    </p>
                    <p>
                      Can delete derived data:{" "}
                      <span className="font-medium text-[color:var(--af-text)]">
                        {formatProviderCapabilityYesNo(capabilities.canDeleteDerivedData)}
                      </span>
                    </p>
                    <p>
                      User review required:{" "}
                      <span className="font-medium text-[color:var(--af-text)]">
                        {formatProviderCapabilityYesNo(capabilities.userReviewRequired)}
                      </span>
                    </p>
                  </div>
                  {warnings.length > 0 ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-950/20 p-2 text-[10px] leading-snug text-amber-100/90">
                      <p className="font-medium text-amber-100">Mock/system notes</p>
                      <ul className="mt-1 list-inside list-disc">
                        {warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </ApplyFlowCard>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]">
            Scopes preview · Data boundaries
          </p>
          <ul className="list-inside list-disc space-y-1 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
            {PROVIDER_CONSENT_MOCK_BOUNDARIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]">
            Preview actions · Local simulation only
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {PROVIDER_CONSENT_MOCK_ACTIONS.map((action) => (
              <ApplyFlowButton
                key={action.id}
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={() => {
                  setLastActionResult(
                    runProviderConsentActionMock(
                      action.action,
                      action.provider,
                      PROVIDER_CONSENT_PREVIEW_REQUESTED_AT,
                    ),
                  );
                }}
              >
                {action.label}
              </ApplyFlowButton>
            ))}
          </div>
        </div>

        {lastActionResult ? <ProviderConsentMockActionResultPreview result={lastActionResult} /> : null}

        <div className="rounded-md border border-[color:var(--af-border-strong)]/60 bg-[color:var(--af-surface)]/40 p-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
          <p className="font-medium text-[color:var(--af-text)]">Safety boundaries</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>No OAuth started</li>
            <li>No provider call made</li>
            <li>No token stored</li>
            <li>No provider data persisted</li>
          </ul>
        </div>
      </div>
    </ApplyFlowCard>
  );
}
