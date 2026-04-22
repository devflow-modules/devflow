/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MetricsDashboardClient } from "../MetricsDashboardClient";

vi.mock("../actions", () => ({
  getAdminMetrics: vi.fn(),
  getAdminRevenue: vi.fn().mockResolvedValue({
    mrr: 0,
    arr: 0,
    arpu: 0,
    churnRate: 0,
    activeSubscriptions: 0,
    canceledInPeriod: 0,
    totalTenants: 0,
  }),
  getAdminUsage: vi.fn().mockResolvedValue({
    from: new Date().toISOString(),
    to: new Date().toISOString(),
    totalMessages: 0,
    totalAi: 0,
    byPeriod: [],
  }),
  getAdminTenants: vi.fn().mockResolvedValue({
    from: new Date().toISOString(),
    to: new Date().toISOString(),
    tenants: [],
  }),
}));

describe("P1 — MetricsDashboardClient (ops + dados vazios)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  it("renderiza cartões Ops com zeros e não rebenta com uso vazio", async () => {
    const { getAdminMetrics } = await import("../actions");
    vi.mocked(getAdminMetrics).mockResolvedValue({
      whatsapp_platform: { metrics: {} },
      ops: { tenants: 0, conversations: 0, messagesLast24h: 0 },
    });

    render(
      <MetricsDashboardClient
        initialData={{
          whatsapp_platform: { metrics: {} },
          ops: { tenants: 0, conversations: 0, messagesLast24h: 0 },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Tenants")).toBeInTheDocument();
    });
    expect(screen.getByText("Conversas")).toBeInTheDocument();
    expect(screen.getByText("Mensagens (24h)")).toBeInTheDocument();
    expect(screen.getByText("Nenhum uso registrado no período.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum tenant com uso no período.")).toBeInTheDocument();
  });
});
