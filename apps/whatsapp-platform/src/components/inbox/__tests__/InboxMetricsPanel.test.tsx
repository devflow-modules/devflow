/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InboxMetricsPanel } from "../InboxMetricsPanel";

const fetchInboxMetrics = vi.fn();
const fetchInboxTeam = vi.fn();
const fetchInboxQueueNext = vi.fn();

vi.mock("../inboxFetch", () => ({
  fetchInboxMetrics: (...args: unknown[]) => fetchInboxMetrics(...args),
  fetchInboxTeam: (...args: unknown[]) => fetchInboxTeam(...args),
  fetchInboxQueueNext: (...args: unknown[]) => fetchInboxQueueNext(...args),
}));

function renderPanel(onOpenThread = vi.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <InboxMetricsPanel onOpenThread={onOpenThread} />
    </QueryClientProvider>
  );
}

describe("InboxMetricsPanel Fatia 6", () => {
  beforeEach(() => {
    fetchInboxMetrics.mockResolvedValue({
      avgQueueWaitSeconds: 90,
      avgHandleSeconds: 300,
      sampleQueue: 4,
      sampleHandle: 2,
      conversationsByAgent: [{ userId: "u1", name: "Ana", openThreads: 3 }],
    });
    fetchInboxTeam.mockResolvedValue([
      { userId: "u1", name: "Ana", email: "ana@x.com", status: "available", activeThreadCount: 1 },
    ]);
    fetchInboxQueueNext.mockResolvedValue({ thread: null });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("preserva fetch de métricas e equipa ao montar (S6-1 A — sem lazy)", async () => {
    renderPanel();
    await waitFor(() => {
      expect(fetchInboxMetrics).toHaveBeenCalledWith(30);
      expect(fetchInboxTeam).toHaveBeenCalled();
    });
    expect(screen.getByTestId("inbox-metrics-panel")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-assume-next")).toBeInTheDocument();
  });

  it("mostra médias densificadas e Assumir próxima", async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText("1 min")).toBeInTheDocument();
      expect(screen.getByText("5 min")).toBeInTheDocument();
    });
    expect(screen.getByTestId("inbox-assume-next")).toBeEnabled();
    expect(screen.getAllByText("Ana").length).toBeGreaterThanOrEqual(1);
  });
});
