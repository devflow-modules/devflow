/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EvaluationModeRibbon } from "../EvaluationModeRibbon";
import * as protectedFetch from "@/lib/protected-fetch";

function renderWithQuery(ui: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("EvaluationModeRibbon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra Modo avaliação quando API devolve FREE", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            plan: "FREE",
            tenantCreatedAt: "2026-01-20T00:00:00.000Z",
            status: "free",
            hasStripeCustomer: false,
            messagesUsed: 0,
            messagesLimit: 50,
            aiUsed: 0,
            aiLimit: 10,
            usagePercentageMessages: 0,
            usagePercentageAI: 0,
            overageMessages: 0,
            overageAI: 0,
            estimatedOverageCost: 0,
            messageUnitPriceBrl: 0,
            aiUnitPriceBrl: 0,
            nextInvoiceDate: null,
            lastInvoiceAmount: null,
            lastInvoiceStatus: null,
            allowsMeteredOverage: false,
            enforceLimits: true,
          },
        }),
    } as ReturnType<typeof protectedFetch.fetchProtected>);

    renderWithQuery(<EvaluationModeRibbon />);

    await waitFor(() => {
      expect(screen.getByTestId("evaluation-mode-ribbon")).toHaveTextContent(/Modo avaliação ativo/i);
    });
  });

  it("não renderiza quando plano é pago", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            plan: "OPERATIONAL_BASE",
            tenantCreatedAt: null,
            status: "active",
            hasStripeCustomer: true,
            messagesUsed: 0,
            messagesLimit: 5000,
            aiUsed: 0,
            aiLimit: 750,
            usagePercentageMessages: 0,
            usagePercentageAI: 0,
            overageMessages: 0,
            overageAI: 0,
            estimatedOverageCost: 0,
            messageUnitPriceBrl: 0.01,
            aiUnitPriceBrl: 0.02,
            nextInvoiceDate: null,
            lastInvoiceAmount: null,
            lastInvoiceStatus: null,
            allowsMeteredOverage: true,
            enforceLimits: false,
          },
        }),
    } as ReturnType<typeof protectedFetch.fetchProtected>);

    renderWithQuery(<EvaluationModeRibbon />);

    await waitFor(() => {
      expect(screen.queryByTestId("evaluation-mode-ribbon")).toBeNull();
    });
  });
});
