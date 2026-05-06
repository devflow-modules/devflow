/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ManagerDashboardSection } from "../ManagerDashboardSection";

const payload = {
  range: { dateFrom: "2026-01-01T00:00:00.000Z", dateTo: "2026-01-31T00:00:00.000Z" },
  operation: { awaiting: 1, unassigned: 2, critical: 0, avgFirstResponseMs: 30_000 },
  team: {
    handled: 4,
    avgResponseMs: 45_000,
    avgFirstResponseMs: 50_000,
    closed: 2,
    agents: [
      {
        userId: "u1",
        name: "Ana",
        email: "ana@test.com",
        handled: 3,
        avgResponseMs: 40_000,
        avgFirstResponseMs: 50_000,
        closed: 1,
      },
    ],
  },
  automation: {
    autoRate: 0.5,
    resolvedByAiRate: 0.2,
    fallbackRate: 0.3,
    playbookUsageRate: 0.1,
    followUpUsageRate: 0.05,
  },
  funnel: {
    lead: 0,
    qualified: 0,
    proposal: 0,
    followUp: 0,
    closed: 0,
    lost: 0,
  },
};

describe("ManagerDashboardSection", () => {
  const originalFetch = global.fetch;
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockImplementation((url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                phoneNumberId: "line-principal",
                label: "Principal",
                displayPhoneNumber: "+55 11 90000-0000",
                isPrimary: true,
                isDefaultOutbound: true,
                status: "ACTIVE",
                purpose: "GENERAL",
              },
              {
                phoneNumberId: "line-prospeccao",
                label: "Prospecção",
                displayPhoneNumber: "+55 13 99188-6087",
                isPrimary: false,
                isDefaultOutbound: false,
                status: "ACTIVE",
                purpose: "PROSPECTING",
              },
            ],
          }),
        } as Response);
      }
      if (u.includes("/api/queues")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              queues: [{ id: "q-sales", name: "Vendas", slug: "vendas", color: null }],
            },
          }),
        } as Response);
      }
      if (u.includes("/api/metrics/manager-dashboard")) {
        return Promise.resolve({
          ok: true,
          json: async () => payload,
        } as Response);
      }
      return Promise.resolve({ ok: false, json: async () => ({}) } as Response);
    });
    global.fetch = fetchMock as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renderiza visão gerencial e tabela de agentes", async () => {
    render(<ManagerDashboardSection />);
    await waitFor(() => {
      expect(screen.getByTestId("manager-dashboard")).toBeInTheDocument();
    });
    expect(screen.getByText("Visão gerencial")).toBeInTheDocument();
    expect(screen.getByTestId("manager-dashboard-agents-table")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("mostra empty state do funil quando total é zero", async () => {
    render(<ManagerDashboardSection />);
    await waitFor(() => {
      expect(screen.getByTestId("manager-dashboard-funnel-empty")).toBeInTheDocument();
    });
    expect(screen.getByText("Sem tags de funil")).toBeInTheDocument();
  });

  it("mostra select de linha quando tenant possui múltiplas linhas", async () => {
    render(<ManagerDashboardSection />);
    await waitFor(() => {
      expect(screen.getByTestId("manager-dash-line")).toBeInTheDocument();
    });
    expect(screen.getByText("Linha WhatsApp")).toBeInTheDocument();
  });

  it("envia businessPhoneNumberId e combina com queueId na URL", async () => {
    render(<ManagerDashboardSection />);

    await waitFor(() => {
      expect(screen.getByTestId("manager-dashboard")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("manager-dash-line"), {
      target: { value: "line-prospeccao" },
    });

    await waitFor(() => {
      const metricCalls = fetchMock.mock.calls
        .map((c) => String(c[0]))
        .filter((u) => u.includes("/api/metrics/manager-dashboard"));
      expect(
        metricCalls.some((u) => u.includes("businessPhoneNumberId=line-prospeccao"))
      ).toBe(true);
    });

    fireEvent.change(screen.getByLabelText("Fila"), {
      target: { value: "q-sales" },
    });

    await waitFor(() => {
      const metricCalls = fetchMock.mock.calls
        .map((c) => String(c[0]))
        .filter((u) => u.includes("/api/metrics/manager-dashboard"));
      expect(
        metricCalls.some(
          (u) =>
            u.includes("queueId=q-sales") &&
            u.includes("businessPhoneNumberId=line-prospeccao")
        )
      ).toBe(true);
    });
  });
});
