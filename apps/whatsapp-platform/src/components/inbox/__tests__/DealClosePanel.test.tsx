/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DealClosePanel } from "../DealClosePanel";
import type { WaInboxThreadRow } from "../inboxTypes";
import type { UserRole } from "@/modules/auth";

type SessionRoleMockValue = {
  role: UserRole | null;
  tenantId: string;
  loading: boolean;
};

const mockSessionRole = vi.fn<() => SessionRoleMockValue>(() => ({
  role: "manager",
  tenantId: "t1",
  loading: false,
}));

vi.mock("@/components/navigation/SessionRoleContext", () => ({
  useSessionRole: () => mockSessionRole(),
}));

vi.mock("../inboxFetch", () => ({
  postCloseInboxDeal: vi.fn(),
  postSuggestInboxDeal: vi.fn(),
  postClearDealSuggestion: vi.fn(),
}));

function baseThread(partial: Partial<WaInboxThreadRow> = {}): WaInboxThreadRow {
  return {
    id: "thread-1",
    phoneNumber: "5511999999999",
    businessPhoneNumberId: "pn-1",
    contactName: "Cliente Alfa",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    lastMessagePreview: "Olá",
    status: "OPEN",
    conversationState: "awaiting_agent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

function renderDeal(thread: WaInboxThreadRow | null, threadId: string | null = thread?.id ?? null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DealClosePanel threadId={threadId} thread={thread} placement="composer" />
    </QueryClientProvider>
  );
}

describe("DealClosePanel Fatia 5", () => {
  beforeEach(() => {
    mockSessionRole.mockReturnValue({ role: "manager", tenantId: "t1", loading: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("manager com deal aberto mostra summary densificado", () => {
    renderDeal(baseThread());
    const root = document.getElementById("inbox-deal-close");
    expect(root).toBeTruthy();
    expect(screen.getByText("Registrar resultado (ganho ou perda)")).toBeInTheDocument();
    const details = root?.querySelector("details");
    expect(details).toBeTruthy();
    expect(details?.open).toBe(false);
  });

  it("manager abre details e vê Fechou venda / Perdeu venda", async () => {
    const user = userEvent.setup();
    renderDeal(baseThread());
    await user.click(screen.getByText("Registrar resultado (ganho ou perda)"));
    expect(screen.getByRole("button", { name: "Fechou venda" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Perdeu venda" })).toBeInTheDocument();
  });

  it("operator vê summary de sugestão", () => {
    mockSessionRole.mockReturnValue({ role: "operator", tenantId: "t1", loading: false });
    renderDeal(baseThread());
    expect(screen.getByText("Registrar resultado — sugestão ao gestor")).toBeInTheDocument();
  });

  it("manager pending mostra Confirmar / Ignorar sempre expandidos", () => {
    renderDeal(
      baseThread({
        dealSuggested: true,
        dealSuggestedStatus: "won",
        dealSuggestedValue: 1500,
      })
    );
    expect(screen.getByText(/Sugestão pendente/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ignorar" })).toBeInTheDocument();
  });

  it("won mostra status compacto", () => {
    renderDeal(baseThread({ dealStatus: "won", dealValue: 1500, dealCurrency: "BRL" }));
    expect(screen.getByText("Venda fechada")).toBeInTheDocument();
    expect(screen.getByText(/1\.500/)).toBeInTheDocument();
  });

  it("lost mostra motivo", () => {
    renderDeal(baseThread({ dealStatus: "lost", dealLostReason: "preco" }));
    expect(screen.getByText("Oportunidade perdida")).toBeInTheDocument();
    expect(screen.getByText(/Preço|preco/i)).toBeInTheDocument();
  });

  it("D5-R1: CLOSED + deal aberto → não monta formulários", () => {
    renderDeal(baseThread({ status: "CLOSED", dealStatus: null }));
    expect(document.getElementById("inbox-deal-close")).toBeNull();
    expect(screen.queryByText(/Registrar resultado/i)).not.toBeInTheDocument();
  });

  it("D5-R1: CLOSED + won → mantém status", () => {
    renderDeal(baseThread({ status: "CLOSED", dealStatus: "won", dealValue: 900, dealCurrency: "BRL" }));
    expect(document.getElementById("inbox-deal-close")).toBeTruthy();
    expect(screen.getByText("Venda fechada")).toBeInTheDocument();
  });

  it("sem role operacional → null", () => {
    mockSessionRole.mockReturnValue({ role: null, tenantId: "t1", loading: false });
    renderDeal(baseThread());
    expect(document.getElementById("inbox-deal-close")).toBeNull();
  });
});
