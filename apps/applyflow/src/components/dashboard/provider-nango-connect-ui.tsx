"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ApplyFlowNangoConnectLauncherResponse } from "@/lib/provider-runtime/nango-connect-session-launcher";
import {
  createProviderRuntimeConnectionStatusFromConnectEvent,
  type ProviderKind,
  type ProviderRuntimeConnectionStatus,
} from "@devflow/career-sync";
import { useEffect, useRef, useState } from "react";
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

export function nangoConnectInteractionResetKey(
  provider: ProviderKind,
  explicitConsentChecked: boolean,
): string {
  return `${provider}:${explicitConsentChecked ? "1" : "0"}`;
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
  const interactionResetKey = nangoConnectInteractionResetKey(provider, explicitConsentChecked);
  const [connectSession, setConnectSession] = useState(() => ({
    resetKey: interactionResetKey,
    interactionStatus: "idle" as NangoConnectUiInteractionStatus,
    connectUiError: null as string | null,
  }));

  if (connectSession.resetKey !== interactionResetKey) {
    setConnectSession({
      resetKey: interactionResetKey,
      interactionStatus: explicitConsentChecked ? "idle" : connectSession.interactionStatus,
      connectUiError: explicitConsentChecked ? null : connectSession.connectUiError,
    });
  }

  const { interactionStatus, connectUiError } = connectSession;
  const resetKeyRef = useRef(interactionResetKey);

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
    resetKeyRef.current = interactionResetKey;
  }, [interactionResetKey]);

  useEffect(() => {
    if (!explicitConsentChecked) {
      return;
    }

    publishConnectionStatus("idle");
    // Connection status is published from this effect only; the helper is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const sessionAtStart = interactionResetKey;
    setConnectSession((current) =>
      current.resetKey !== sessionAtStart
        ? current
        : { ...current, interactionStatus: "starting", connectUiError: null },
    );
    publishConnectionStatus("connect_start");

    try {
      await openNangoConnectUi({
        sessionToken: launcherResult.connectSessionToken,
        onEvent: (event) => {
          const nextInteractionStatus = mapNangoConnectUiEventToStatus(event, "starting");
          setConnectSession((current) =>
            current.resetKey !== sessionAtStart
              ? current
              : {
                  ...current,
                  interactionStatus: nextInteractionStatus,
                  connectUiError:
                    event.type === "error"
                      ? "Nango Connect UI reported an error. No provider data was stored."
                      : current.connectUiError,
                },
          );
          if (resetKeyRef.current !== sessionAtStart) {
            return;
          }
          publishConnectionStatus(mapNangoInteractionToConnectEvent(nextInteractionStatus));
        },
      });
    } catch {
      setConnectSession((current) =>
        current.resetKey !== sessionAtStart
          ? current
          : {
              ...current,
              interactionStatus: "error",
              connectUiError: "Could not open Nango Connect UI. No provider data was stored.",
            },
      );
      if (resetKeyRef.current === sessionAtStart) {
        publishConnectionStatus("connect_error");
      }
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
