// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createEmptyProviderDerivedSignalSummary } from "@devflow/career-sync";

import {
  PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES,
} from "./provider-derived-runtime-preview-content";
import type { ProviderDerivedRuntimePreviewClientOutcome } from "./provider-derived-runtime-preview-client";
import { ProviderDerivedRuntimePreviewPanel } from "./provider-derived-runtime-preview-panel";

const { runPreviewMock } = vi.hoisted(() => ({
  runPreviewMock: vi.fn(),
}));

vi.mock("./provider-derived-runtime-preview-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./provider-derived-runtime-preview-client")>();
  return {
    ...actual,
    runProviderDerivedRuntimePreview: runPreviewMock,
  };
});

const connectedVerification = (provider: "gmail" | "calendar") => ({
  provider,
  runtime: "nango" as const,
  state: "connected" as const,
  verifiedByServer: true as const,
  safeForClient: true as const,
  canSync: false as const,
  canImportProviderData: false as const,
  canPersistProviderPayload: false as const,
  hasToken: false as const,
  checkedAt: "2026-06-15T12:00:00.000Z",
  messages: ["verified"],
  warnings: [],
});

const completedOutcome: ProviderDerivedRuntimePreviewClientOutcome = {
  ok: true,
  httpStatus: 200,
  result: {
    runtime: "nango",
    status: "completed",
    safeForClient: true,
    readOnly: true,
    userReviewRequired: true,
    gmailStatus: "completed",
    calendarStatus: "completed",
    processedMessageCount: 1,
    processedEventCount: 0,
    importedRawProviderData: false,
    retainedRawPayload: false,
    retainedBodies: false,
    retainedSnippets: false,
    retainedDescriptions: false,
    retainedLocations: false,
    retainedMeetingLinks: false,
    retainedProviderIdentifiers: false,
    retainedAttendeeAddresses: false,
    hasToken: false,
    signals: [],
    summary: createEmptyProviderDerivedSignalSummary(),
    warnings: [],
    messages: ["ok"],
  },
};

afterEach(() => {
  cleanup();
  runPreviewMock.mockReset();
});

describe("ProviderDerivedRuntimePreviewPanel session reset", () => {
  it("mantém o estado vazio estável sem loop de atualização", async () => {
    render(
      <ProviderDerivedRuntimePreviewPanel
        explicitConsentChecked={false}
        gmailVerification={null}
        calendarVerification={null}
      />,
    );

    expect(screen.getByTestId("provider-derived-runtime-preview-status-message").textContent).toBe(
      PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES.idle,
    );
    await waitFor(() => {
      expect(screen.getByTestId("provider-derived-runtime-preview-status-message").textContent).toBe(
        PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES.idle,
      );
      expect(screen.queryByTestId("provider-derived-runtime-preview-summary")).toBeNull();
    });
  });

  it("ignora um preview assíncrono depois de o consentimento mudar", async () => {
    let resolvePreview: (value: ProviderDerivedRuntimePreviewClientOutcome) => void = () => undefined;
    runPreviewMock.mockReturnValue(
      new Promise<ProviderDerivedRuntimePreviewClientOutcome>((resolve) => {
        resolvePreview = resolve;
      }),
    );

    const { rerender } = render(
      <ProviderDerivedRuntimePreviewPanel
        explicitConsentChecked={true}
        gmailVerification={connectedVerification("gmail")}
        calendarVerification={connectedVerification("calendar")}
      />,
    );

    fireEvent.click(screen.getByTestId("provider-derived-runtime-preview-button"));
    expect(screen.getByText("Running preview…")).toBeTruthy();

    rerender(
      <ProviderDerivedRuntimePreviewPanel
        explicitConsentChecked={false}
        gmailVerification={connectedVerification("gmail")}
        calendarVerification={connectedVerification("calendar")}
      />,
    );

    resolvePreview(completedOutcome);

    await waitFor(() => {
      expect(screen.getByTestId("provider-derived-runtime-preview-status-message").textContent).toBe(
        PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES.idle,
      );
    });
    expect(screen.queryByTestId("provider-derived-runtime-preview-summary")).toBeNull();
  });
});
