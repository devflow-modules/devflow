// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { persistDashboardImport } from "@/lib/local-import-storage";
import { APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY } from "@/lib/local-inbound-response-storage";
import { ProviderDerivedRuntimePreviewPanel } from "./provider-derived-runtime-preview-panel";

vi.mock("@/lib/local-import-storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/local-import-storage")>("@/lib/local-import-storage");
  return {
    ...actual,
    loadDashboardImport: vi.fn(() => ({
      version: 1 as const,
      importedAt: "2026-09-15T12:00:00.000Z",
      applications: [
        {
          id: "local-only",
          createdAt: "2026-09-15T12:00:00.000Z",
          updatedAt: "2026-09-15T12:00:00.000Z",
          source: "paste" as const,
          status: "applied" as const,
          companyName: "Local Only Co",
        },
      ],
    })),
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

const remoteApplication = {
  id: "app-remote",
  createdAt: "2026-09-15T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
  source: "paste" as const,
  status: "applied" as const,
  companyName: "Remote Canonical Co",
  jobTitle: "Staff Engineer",
};

describe("provider preview application source", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("uses the applications passed by the dashboard and does not read V1 import storage", async () => {
    window.localStorage.setItem(
      APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: "2026-09-15T18:00:00.000Z",
        detections: [
          {
            id: "detect-preview",
            emailId: "gmail-preview",
            applicationId: "app-remote",
            headline: "Resposta recebida",
            matchStatus: "ambiguous",
            matchConfidence: "low",
            matchEvidence: ["domínio"],
            classification: "interview",
            classificationConfidence: "low",
            classificationEvidence: ["entrevista"],
            suggestedStatus: "screening",
            fromStatus: "applied",
            pipelineChange: true,
            state: "pending_review",
            detectedAt: "2026-09-15T18:00:00.000Z",
            receivedAt: "2026-09-15T18:00:00.000Z",
            senderDomain: "remotecanonical.com",
            autoApply: false,
            reviewRequired: true,
            alternateApplicationIds: ["app-remote", "local-only"],
          },
        ],
      }),
    );
    persistDashboardImport([
      {
        id: "local-only",
        createdAt: "2026-09-15T12:00:00.000Z",
        updatedAt: "2026-09-15T12:00:00.000Z",
        source: "paste",
        status: "applied",
        companyName: "Local Only Co",
      },
    ]);
    const fetchImpl = vi.fn(async () =>
      Response.json({
        runtime: "nango",
        status: "completed",
        safeForClient: true,
        readOnly: true,
        signals: [
          {
            id: "sig-remote",
            occurredAt: "2026-09-15T18:00:00.000Z",
            company: "remotecanonical.com",
            kind: "provider_email_activity",
            reason: "metadata",
          },
        ],
        summary: {
          totalSignals: 1,
          gmailSignalCount: 1,
          calendarSignalCount: 0,
          companies: [],
          kinds: ["provider_email_activity"],
          hasInterviewSignal: false,
          hasPendingActionSignal: false,
          hasOfferSignal: false,
          hasRejectionSignal: false,
        },
        warnings: [],
        processedMessageCount: 1,
        processedEventCount: 0,
      }),
    );
    vi.stubGlobal("fetch", fetchImpl);

    const { loadDashboardImport } = await import("@/lib/local-import-storage");
    render(
      <ProviderDerivedRuntimePreviewPanel
        explicitConsentChecked
        gmailVerification={connectedVerification("gmail")}
        calendarVerification={connectedVerification("calendar")}
        applications={[remoteApplication]}
        persistenceV2Enabled
      />,
    );

    fireEvent.click(screen.getByTestId("provider-derived-runtime-preview-button"));

    expect(await screen.findByText(/Remote Canonical Co/)).toBeTruthy();
    expect(screen.queryByText(/Local Only Co/)).toBeNull();
    expect(loadDashboardImport).not.toHaveBeenCalled();
  });
});
