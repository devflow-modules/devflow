"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ProviderConnectionVerificationResult, ProviderKind } from "@devflow/career-sync";
import { useState } from "react";
import {
  PROVIDER_CONNECTION_DISCONNECT_CANCEL_LABEL,
  PROVIDER_CONNECTION_DISCONNECT_CONFIRM_BODY,
  PROVIDER_CONNECTION_DISCONNECT_CONFIRM_LABEL,
  PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE,
  PROVIDER_CONNECTION_DISCONNECT_GOOGLE_HINT,
  PROVIDER_CONNECTION_DISCONNECT_LABELS,
  PROVIDER_CONNECTION_DISCONNECT_SUCCESS_LABELS,
} from "./provider-connection-disconnect-content";
import {
  isProviderDisconnectUiEnabled,
  runProviderConnectionDisconnect,
} from "./provider-connection-disconnect-client";

export type ProviderConnectionDisconnectUiState =
  | "idle"
  | "confirming"
  | "disconnecting"
  | "disconnected"
  | "blocked"
  | "error";

/**
 * Real provider disconnect UI — server-side Nango removal with explicit confirmation.
 * Does not revoke Google OAuth directly or mutate CareerBundle data.
 */

export function ProviderConnectionDisconnectPanel({
  provider,
  explicitConsentChecked,
  verificationResult,
  onDisconnected,
}: {
  provider: ProviderKind;
  explicitConsentChecked: boolean;
  verificationResult: ProviderConnectionVerificationResult | null;
  onDisconnected: (provider: ProviderKind) => void;
}) {
  const [uiState, setUiState] = useState<ProviderConnectionDisconnectUiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isDisconnecting = uiState === "disconnecting";
  const canStartDisconnect =
    explicitConsentChecked &&
    (verificationResult?.state === "connected" || uiState === "error") &&
    isProviderDisconnectUiEnabled({
      explicitConsentChecked,
      isDisconnecting,
      uiState,
    });

  async function handleDisconnect() {
    if (!explicitConsentChecked || isDisconnecting) {
      return;
    }

    setUiState("disconnecting");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await runProviderConnectionDisconnect({
        provider,
        explicitConfirmation: true,
      });

      if (result.status === "completed" && result.disconnected) {
        setUiState("disconnected");
        setStatusMessage(PROVIDER_CONNECTION_DISCONNECT_SUCCESS_LABELS[provider]);
        onDisconnected(provider);
        return;
      }

      if (result.status === "blocked") {
        setUiState("blocked");
        setErrorMessage(result.messages[0] ?? "Provider disconnect is blocked.");
        return;
      }

      setUiState("error");
      setErrorMessage(result.messages[0] ?? "Provider disconnect failed safely.");
    } catch {
      setUiState("error");
      setErrorMessage("Could not reach the server-side disconnect boundary. No tokens were stored.");
    }
  }

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-rose-500/25 bg-rose-950/10"
      data-testid={`provider-connection-disconnect-panel-${provider}`}
    >
      <div className="space-y-2 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        {uiState === "confirming" ? (
          <div className="space-y-2" data-testid={`provider-disconnect-confirm-${provider}`}>
            <p className="text-xs font-semibold text-rose-100/95">
              {PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE}
            </p>
            <p>{PROVIDER_CONNECTION_DISCONNECT_CONFIRM_BODY}</p>
            <div className="flex flex-wrap gap-2">
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={() => {
                  setUiState("idle");
                  setErrorMessage(null);
                }}
                data-testid={`provider-disconnect-cancel-${provider}`}
              >
                {PROVIDER_CONNECTION_DISCONNECT_CANCEL_LABEL}
              </ApplyFlowButton>
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                disabled={isDisconnecting}
                onClick={() => {
                  void handleDisconnect();
                }}
                data-testid={`provider-disconnect-confirm-button-${provider}`}
              >
                {isDisconnecting ? "Disconnecting…" : PROVIDER_CONNECTION_DISCONNECT_CONFIRM_LABEL}
              </ApplyFlowButton>
            </div>
          </div>
        ) : (
          <>
            <ApplyFlowButton
              type="button"
              variant="outlineBrand"
              size="sm"
              disabled={!canStartDisconnect}
              onClick={() => {
                setUiState("confirming");
                setErrorMessage(null);
                setStatusMessage(null);
              }}
              data-testid={`provider-disconnect-start-${provider}`}
            >
              {PROVIDER_CONNECTION_DISCONNECT_LABELS[provider]}
            </ApplyFlowButton>
            {statusMessage ? (
              <p className="text-emerald-200/90" data-testid={`provider-disconnect-success-${provider}`}>
                {statusMessage}
              </p>
            ) : null}
            {uiState === "disconnected" ? (
              <p className="text-[color:var(--af-text-muted)]">{PROVIDER_CONNECTION_DISCONNECT_GOOGLE_HINT}</p>
            ) : null}
          </>
        )}
        {errorMessage ? (
          <p className="text-amber-200/90" data-testid={`provider-disconnect-error-${provider}`}>
            {errorMessage}
          </p>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}
