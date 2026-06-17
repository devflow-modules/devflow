"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ApplyFlowNangoConnectLauncherResponse } from "@/lib/provider-runtime/nango-connect-session-launcher";
import type { ProviderKind, ProviderRuntimeConnectionStatus } from "@devflow/career-sync";
import { createProviderRuntimeConnectionStatusFromConnectEvent } from "@devflow/career-sync";
import type { ProviderConnectionVerificationResult } from "@devflow/career-sync";
import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import type { CareerBundleSyncEnrichmentSourceKind } from "@/lib/career-bundle-sync-enrichment-source";
import { useState } from "react";
import {
  PROVIDER_CONSENT_CONFIRMATION_BADGE,
  PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES,
  PROVIDER_CONSENT_CONFIRMATION_CHECKBOX_LABEL,
  PROVIDER_CONSENT_CONFIRMATION_NEVER_STORED,
  PROVIDER_CONSENT_CONFIRMATION_PROVIDER_OPTIONS,
  PROVIDER_CONSENT_CONFIRMATION_RESULT_TITLE,
  PROVIDER_CONSENT_CONFIRMATION_RUNTIME,
  PROVIDER_CONSENT_CONFIRMATION_SCOPES,
  PROVIDER_CONSENT_CONFIRMATION_START_BUTTON_LABEL,
  PROVIDER_CONSENT_CONFIRMATION_TITLE,
} from "./provider-consent-confirmation-content";
import { formatProviderCapabilityYesNo } from "./provider-consent-mock-data";
import { runProviderConsentLauncherCheck } from "./provider-consent-launcher-client";
import { ProviderNangoConnectUi } from "./provider-nango-connect-ui";
import { openNangoConnectUiWithFrontendSdk } from "./provider-nango-connect-client";
import { ProviderConnectionStatusPanel } from "./provider-connection-status-panel";
import { runProviderConnectionVerificationCheck } from "./provider-connection-verification-client";
import { ProviderDerivedRuntimePreviewPanel } from "./provider-derived-runtime-preview-panel";
import { ProviderConnectionDisconnectPanel } from "./provider-connection-disconnect-panel";

/**
 * Explicit provider consent UI with Nango Connect UI behind runtime flags.
 * Uses React local state only — no browser persistence or backend storage.
 * Does not import Gmail/Calendar data or expose tokens.
 */

export function ProviderConsentLauncherResultPreview({
  result,
}: {
  result: ApplyFlowNangoConnectLauncherResponse;
}) {
  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-cyan-500/25 bg-cyan-950/15"
      data-testid="provider-consent-launcher-result"
    >
      <div className="space-y-2 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <p className="text-xs font-semibold text-cyan-100/95">{PROVIDER_CONSENT_CONFIRMATION_RESULT_TITLE}</p>
        <p>
          Status:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{result.status}</span>
        </p>
        <p>
          Can start OAuth:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {formatProviderCapabilityYesNo(result.canStartOAuth)}
          </span>
        </p>
        {result.provider ? (
          <p>
            Provider:{" "}
            <span className="font-medium text-[color:var(--af-text)]">{result.provider}</span>
          </p>
        ) : null}
        <p>
          Runtime:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{result.runtime}</span>
        </p>
        {result.reasons.length > 0 ? (
          <p>
            Reasons:{" "}
            <span className="font-medium text-[color:var(--af-text)]">{result.reasons.join(", ")}</span>
          </p>
        ) : null}
        {result.messages.length > 0 ? (
          <p>
            Messages:{" "}
            <span className="font-medium text-[color:var(--af-text)]">{result.messages.join(" ")}</span>
          </p>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}

export function ProviderConsentConfirmationPanel({
  currentSyncEnrichment = null,
  baselineSourceKind = "none",
  onEligibleProviderEnrichmentChange,
}: {
  currentSyncEnrichment?: CareerBundleUnifiedSyncEnrichment | null;
  baselineSourceKind?: CareerBundleSyncEnrichmentSourceKind;
  onEligibleProviderEnrichmentChange?: (enrichment: CareerBundleUnifiedSyncEnrichment | null) => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderKind>("gmail");
  const [explicitConsentChecked, setExplicitConsentChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLauncherResult, setLastLauncherResult] =
    useState<ApplyFlowNangoConnectLauncherResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ProviderRuntimeConnectionStatus>(() =>
    createProviderRuntimeConnectionStatusFromConnectEvent({
      provider: "gmail",
      event: "idle",
      updatedAt: new Date(0).toISOString(),
    }),
  );
  const [verificationByProvider, setVerificationByProvider] = useState<
    Record<ProviderKind, ProviderConnectionVerificationResult | null>
  >({
    gmail: null,
    calendar: null,
  });
  const [isVerifyingConnection, setIsVerifyingConnection] = useState(false);
  const [verificationErrorMessage, setVerificationErrorMessage] = useState<string | null>(null);

  const verificationResult = verificationByProvider[selectedProvider];

  const scopesPreview = PROVIDER_CONSENT_CONFIRMATION_SCOPES[selectedProvider].join(", ");
  const neverStored = PROVIDER_CONSENT_CONFIRMATION_NEVER_STORED[selectedProvider];
  const startDisabled = !explicitConsentChecked || isLoading;

  async function handleVerifyConnection() {
    if (!explicitConsentChecked || connectionStatus.state !== "connected") {
      return;
    }

    setIsVerifyingConnection(true);
    setVerificationErrorMessage(null);

    try {
      const outcome = await runProviderConnectionVerificationCheck({
        explicitConsentChecked,
        provider: selectedProvider,
      });

      if (outcome.called) {
        setVerificationByProvider((current) => ({
          ...current,
          [selectedProvider]: outcome.result,
        }));
      }
    } catch {
      setVerificationErrorMessage(
        "Could not reach the server-side verification boundary. No tokens or provider data were stored.",
      );
    } finally {
      setIsVerifyingConnection(false);
    }
  }

  async function handleStartConnectionCheck() {
    if (!explicitConsentChecked) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const outcome = await runProviderConsentLauncherCheck({
        explicitConsentChecked,
        provider: selectedProvider,
      });

      if (outcome.called) {
        setLastLauncherResult(outcome.result);
      }
    } catch {
      setErrorMessage("Could not reach the server-side launcher. No tokens or provider data were stored.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleProviderDisconnected(provider: ProviderKind) {
    setVerificationByProvider((current) => ({
      ...current,
      [provider]: null,
    }));
    if (provider === selectedProvider) {
      setConnectionStatus(
        createProviderRuntimeConnectionStatusFromConnectEvent({
          provider,
          event: "not_connected",
          updatedAt: new Date().toISOString(),
        }),
      );
      setLastLauncherResult(null);
    }
    setVerificationErrorMessage(null);
  }

  return (
    <ApplyFlowCard variant="muted" padding="md" className="border border-[color:var(--af-border-strong)]/80">
      <div className="space-y-4" data-testid="provider-consent-confirmation-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[color:var(--af-text)]">
              {PROVIDER_CONSENT_CONFIRMATION_TITLE}
            </h3>
            <ApplyFlowBadge tone="warning">{PROVIDER_CONSENT_CONFIRMATION_BADGE}</ApplyFlowBadge>
          </div>
          <p className="shrink-0 text-[11px] text-[color:var(--af-text-muted)]">
            Runtime:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {PROVIDER_CONSENT_CONFIRMATION_RUNTIME}
            </span>
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="provider-consent-provider-select"
            className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]"
          >
            Provider
          </label>
          <select
            id="provider-consent-provider-select"
            value={selectedProvider}
            onChange={(event) => {
              const nextProvider = event.target.value as ProviderKind;
              setSelectedProvider(nextProvider);
              setLastLauncherResult(null);
              setErrorMessage(null);
              setVerificationErrorMessage(null);
              setConnectionStatus(
                createProviderRuntimeConnectionStatusFromConnectEvent({
                  provider: nextProvider,
                  event: "idle",
                  updatedAt: new Date().toISOString(),
                }),
              );
            }}
            className="w-full max-w-xs rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-3 py-2 text-xs text-[color:var(--af-text)]"
          >
            {PROVIDER_CONSENT_CONFIRMATION_PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]">
            Scopes preview
          </p>
          <p className="text-[11px] leading-snug text-[color:var(--af-text-muted)]">
            <span className="font-medium text-cyan-200/90">{scopesPreview}</span>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]">
            Never stored
          </p>
          <p className="text-[11px] leading-snug text-[color:var(--af-text-muted)]">
            <span className="font-medium text-amber-200/90">{neverStored}</span>
          </p>
        </div>

        <ul className="list-inside list-disc space-y-1 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
          {PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <label className="flex items-start gap-2 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
          <input
            type="checkbox"
            checked={explicitConsentChecked}
            onChange={(event) => {
              setExplicitConsentChecked(event.target.checked);
              if (!event.target.checked) {
                setLastLauncherResult(null);
                setVerificationByProvider({ gmail: null, calendar: null });
                setVerificationErrorMessage(null);
              }
            }}
            className="mt-0.5"
            data-testid="provider-consent-explicit-checkbox"
          />
          <span>{PROVIDER_CONSENT_CONFIRMATION_CHECKBOX_LABEL}</span>
        </label>

        <ApplyFlowButton
          type="button"
          variant="outlineBrand"
          size="sm"
          disabled={startDisabled}
          onClick={() => {
            void handleStartConnectionCheck();
          }}
          data-testid="provider-consent-start-button"
        >
          {isLoading ? "Checking launcher…" : PROVIDER_CONSENT_CONFIRMATION_START_BUTTON_LABEL}
        </ApplyFlowButton>

        {errorMessage ? (
          <p className="text-[11px] text-amber-200/90" data-testid="provider-consent-launcher-error">
            {errorMessage}
          </p>
        ) : null}

        {lastLauncherResult ? <ProviderConsentLauncherResultPreview result={lastLauncherResult} /> : null}

        {explicitConsentChecked ? (
          <ProviderConnectionStatusPanel
            status={connectionStatus}
            verificationResult={verificationResult}
            isVerifying={isVerifyingConnection}
            explicitConsentChecked={explicitConsentChecked}
            onVerifyConnection={() => {
              void handleVerifyConnection();
            }}
          />
        ) : null}

        {verificationErrorMessage ? (
          <p className="text-[11px] text-amber-200/90" data-testid="provider-verification-error">
            {verificationErrorMessage}
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {(["gmail", "calendar"] as const).map((provider) => (
            <ProviderConnectionDisconnectPanel
              key={provider}
              provider={provider}
              explicitConsentChecked={explicitConsentChecked}
              verificationResult={verificationByProvider[provider]}
              onDisconnected={handleProviderDisconnected}
            />
          ))}
        </div>

        <ProviderNangoConnectUi
          provider={selectedProvider}
          explicitConsentChecked={explicitConsentChecked}
          launcherResult={lastLauncherResult}
          openNangoConnectUi={openNangoConnectUiWithFrontendSdk}
          onConnectionStatusChange={setConnectionStatus}
        />

        {explicitConsentChecked ? (
          <ProviderDerivedRuntimePreviewPanel
            explicitConsentChecked={explicitConsentChecked}
            gmailVerification={verificationByProvider.gmail}
            calendarVerification={verificationByProvider.calendar}
            currentSyncEnrichment={currentSyncEnrichment}
            baselineSourceKind={baselineSourceKind}
            onEligibleProviderEnrichmentChange={onEligibleProviderEnrichmentChange}
          />
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}
