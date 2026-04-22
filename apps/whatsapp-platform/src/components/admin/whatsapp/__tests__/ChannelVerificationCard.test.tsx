/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelVerificationCard } from "../ChannelVerificationCard";

const fetchProtected = vi.fn();

const toastHoisted = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock("@/lib/protected-fetch", () => ({
  fetchProtected: (...a: unknown[]) => fetchProtected(...a),
  protectedApiUserMessage: () => "Erro API",
}));

vi.mock("@/components/ui/simple-toast", () => ({
  useSimpleToast: () => ({
    showToast: toastHoisted.showToast,
    toastAnchor: null,
  }),
}));

describe("P0 — ChannelVerificationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra estado e prontidão após GET", async () => {
    fetchProtected.mockImplementation((url: string) => {
      if (url.includes("/verification") && !url.includes("/checklist") && !url.includes("/status")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              channelId: "c1",
              status: "IN_REVIEW",
              checklist: {
                items: [
                  { id: "business_profile", label: "Item A", done: true },
                  { id: "domain_or_website", label: "Item B", done: false },
                  { id: "legal_docs", label: "Item C", done: false },
                  { id: "phone_match", label: "Item D", done: false },
                  { id: "two_factor", label: "Item E", done: false },
                ],
              },
              readinessScore: 20,
              suggestedStatus: null,
              verificationChecklistUpdatedAt: null,
              verificationReadyAt: null,
              verificationSubmittedAt: null,
              verificationApprovedAt: null,
              verificationRejectedAt: null,
            },
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
    });

    render(<ChannelVerificationCard channelId="c1" onTimelineRefresh={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("channel-verification-card")).toBeInTheDocument();
    });
    expect(screen.getByText("Em revisão")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  it("toggle na checklist chama POST checklist e atualiza UI", async () => {
    const user = userEvent.setup();
    let score = 20;
    fetchProtected.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/verification/checklist") && init?.method === "POST") {
        score = 40;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              channelId: "c1",
              status: "NOT_STARTED",
              checklist: {
                items: [
                  { id: "business_profile", label: "Item A", done: true },
                  { id: "domain_or_website", label: "Item B", done: true },
                  { id: "legal_docs", label: "Item C", done: false },
                  { id: "phone_match", label: "Item D", done: false },
                  { id: "two_factor", label: "Item E", done: false },
                ],
              },
              readinessScore: score,
              suggestedStatus: null,
              verificationChecklistUpdatedAt: new Date().toISOString(),
              verificationReadyAt: null,
              verificationSubmittedAt: null,
              verificationApprovedAt: null,
              verificationRejectedAt: null,
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            channelId: "c1",
            status: "NOT_STARTED",
            checklist: {
              items: [
                { id: "business_profile", label: "Item A", done: true },
                { id: "domain_or_website", label: "Item B", done: false },
                { id: "legal_docs", label: "Item C", done: false },
                { id: "phone_match", label: "Item D", done: false },
                { id: "two_factor", label: "Item E", done: false },
              ],
            },
            readinessScore: 20,
            suggestedStatus: null,
            verificationChecklistUpdatedAt: null,
            verificationReadyAt: null,
            verificationSubmittedAt: null,
            verificationApprovedAt: null,
            verificationRejectedAt: null,
          },
        }),
      });
    });

    render(<ChannelVerificationCard channelId="c1" onTimelineRefresh={vi.fn()} />);

    await waitFor(() => screen.getByTestId("channel-verification-card"));
    const cb = screen.getAllByRole("checkbox", { name: /Item B/i })[0];
    await user.click(cb);

    await waitFor(() => {
      expect(screen.getByText("40%")).toBeInTheDocument();
    });
    expect(fetchProtected).toHaveBeenCalledWith(
      expect.stringContaining("/verification/checklist"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
