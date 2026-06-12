"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ApplyFlowNangoConnectLauncherResponse } from "@/lib/provider-runtime/nango-connect-session-launcher";
import {
  createProviderRuntimeConnectionStatusFromConnectEvent,
  type ProviderKind,
  type ProviderRuntimeConnectionStatus,
} from "@devflow/career-sync";
import { useEffect, useState } from "react";
import {
  type NangoConnectUiEvent,
  type OpenNangoConnectUiFn,
} from "./provider-nango-connect-client";
import { mapNangoInteractionToConnectEvent } from "./provider-connection-runtime-status";

export type NangoConnectUiStatus =
  | "idle"
  | "available"
  | "starting"
  | "completed"
  | "cancelled"
  | "error"
  | "unavailable";

export type NangoConnectUiInteractionStatus = "idle" | "starting" | "completed" | "cancelled" | "error";

export const PROVIDER_NANGO_CONNECT_START_LABEL = "Start Nango Connect";

export const PROVIDER_NANGO_CONNECT_COMPLETED_LINES = [
  "Connection flow completed",
  "No Gmail/Calendar data imported",
  "No sync started",
  "No provider payload stored",
] as const;

export function mapNangoConnectUiEventToStatus(
  event: NangoConnectUiEvent,
  previousStatus: NangoConnectUiInteractionStatus,
): NangoConnectUiInteractionStatus {
  if (event.type === "connect") {
    return "completed";
  }

  if (event.type === "close") {
    return previousStatus === "starting" ? "cancelled" : previousStatus;
  }

  return "error";
}

export function resolveNangoConnectUiAvailability(input: {
  explicitConsentChecked: boolean;
  launcherResult: ApplyFlowNangoConnectLauncherResponse | null;
}): NangoConnectUiStatus {
  if (!input.explicitConsentChecked || !input.launcherResult) {
    return "idle";
  }

  if (input.launcherResult.status === "blocked") {
    return "unavailable";
  }

  if (
    input.launcherResult.status === "oauth_start_ready" &&
    input.launcherResult.canStartOAuth &&
    input.launcherResult.connectSessionToken
  ) {
    return "available";
  }

  return "unavailable";
}

export function ProviderNangoConnectUi({
  provider,
  explicitConsentChecked,
  launcherResult,
  openNangoConnectUi,
  onConnectionStatusChange,
}: {
  provider: ProviderKind;
  explicitConsentChecked: boolean;
  launcherResult: ApplyFlowNangoConnectLauncherResponse | null;
  openNangoConnectUi?: OpenNangoConnectUiFn;
  onConnectionStatusChange?: (status: ProviderRuntimeConnectionStatus) => void;
}) {
  const availability = resolveNangoConnectUiAvailability({
    explicitConsentChecked,
    launcherResult,
  });
  const [interactionStatus, setInteractionStatus] = useState<NangoConnectUiInteractionStatus>("idle");
  const [connectUiError, setConnectUiError] = useState<string | null>(null);

  function publishConnectionStatus(event: Parameters<typeof createProviderRuntimeConnectionStatusFromConnectEvent>[0]["event"]) {
    const status = createProviderRuntimeConnectionStatusFromConnectEvent({
      provider,
      event,
      updatedAt: new Date().toISOString(),
    });
    onConnectionStatusChange?.(status);
    return status;
  }

  useEffect(() => {
    if (!explicitConsentChecked) {
      return;
    }

    publishConnectionStatus("idle");
    setInteractionStatus("idle");
    setConnectUiError(null);
  }, [provider, explicitConsentChecked]);

  if (!explicitConsentChecked || !launcherResult) {
    return null;
  }

  async function handleStartNangoConnect() {
    if (
      availability !== "available" ||
      !launcherResult?.connectSessionToken ||
      interactionStatus === "starting" ||
      !openNangoConnectUi
    ) {
      return;
    }

    setInteractionStatus("starting");
    setConnectUiError(null);
    publishConnectionStatus("connect_start");

    try {
      await openNangoConnectUi({
        sessionToken: launcherResult.connectSessionToken,
        onEvent: (event) => {
          const nextInteractionStatus = mapNangoConnectUiEventToStatus(event, "starting");
          setInteractionStatus(nextInteractionStatus);
          publishConnectionStatus(mapNangoInteractionToConnectEvent(nextInteractionStatus));
          if (event.type === "error") {
            setConnectUiError("Nango Connect UI reported an error. No provider data was stored.");
          }
        },
      });
    } catch {
      setInteractionStatus("error");
      publishConnectionStatus("connect_error");
      setConnectUiError("Could not open Nango Connect UI. No provider data was stored.");
    }
  }

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-emerald-500/25 bg-emerald-950/10"
      data-testid="provider-nango-connect-ui"
    >
      <div className="space-y-2 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <p className="text-xs font-semibold text-emerald-100/95">Nango Connect UI</p>

        {availability === "unavailable" ? (
          <p data-testid="provider-nango-connect-unavailable">Connect UI unavailable</p>
        ) : null}

        {availability === "available" || availability === "unavailable" ? (
          <p>
            Status:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {launcherResult.status}
            </span>
          </p>
        ) : null}

        {availability === "available" ? (
          <p data-testid="provider-nango-connect-available">Nango Connect available</p>
        ) : null}

        {availability === "available" && openNangoConnectUi ? (
          <ApplyFlowButton
            type="button"
            variant="primary"
            size="sm"
            disabled={interactionStatus === "starting" || interactionStatus === "completed"}
            onClick={() => {
              void handleStartNangoConnect();
            }}
            data-testid="provider-nango-connect-start-button"
          >
            {interactionStatus === "starting" ? "Opening Nango Connect…" : PROVIDER_NANGO_CONNECT_START_LABEL}
          </ApplyFlowButton>
        ) : null}

        {connectUiError ? (
          <p className="text-amber-200/90" data-testid="provider-nango-connect-error">
            {connectUiError}
          </p>
        ) : null}

        {interactionStatus === "cancelled" ? (
          <p data-testid="provider-nango-connect-cancelled">Connect UI closed before completion.</p>
        ) : null}

        {interactionStatus === "completed" ? (
          <ul
            className="list-inside list-disc space-y-1 text-emerald-100/90"
            data-testid="provider-nango-connect-completed"
          >
            {PROVIDER_NANGO_CONNECT_COMPLETED_LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}
