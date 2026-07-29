/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LeadDataPanel } from "../LeadDataPanel";
import type { WaInboxThreadRow } from "../inboxTypes";
import type { UserRole } from "@/modules/auth";
import { SupportProvider } from "@/components/support/SupportProvider";

type SessionRoleMockValue = {
  role: UserRole;
  tenantId: string;
  loading: boolean;
};

const mockSessionRole = vi.fn<() => SessionRoleMockValue>(() => ({
  role: "operator",
  tenantId: "t1",
  loading: false,
}));

vi.mock("@/lib/protected-fetch", () => ({
  fetchProtected: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        user: { id: "u1", name: "Ana", email: "a@x.com", role: "operator", tenantId: "t1" },
      },
    }),
  }),
  isFeatureBlockedError: () => false,
}));

vi.mock("@/components/navigation/SessionRoleContext", () => ({
  useSessionRole: () => mockSessionRole(),
}));

vi.mock("../DevFlowProspectPanel", () => ({
  DevFlowProspectPanel: () => <div data-testid="devflow-prospect-panel">Prospect mock</div>,
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
    priority: "HIGH",
    leadScore: 72,
    leadData: { name: "Alfa", interest: "Plano Pro", budget: undefined, urgency: "alta" },
    aiState: "qualifying",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

function renderPanel(thread: WaInboxThreadRow | null, evaluationMode = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SupportProvider>
        <LeadDataPanel thread={thread} evaluationMode={evaluationMode} />
      </SupportProvider>
    </QueryClientProvider>
  );
}

describe("LeadDataPanel Fatia 4", () => {
  beforeEach(() => {
    mockSessionRole.mockReturnValue({ role: "operator", tenantId: "t1", loading: false });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("Resumo abre com glance score/prioridade antes da Situação", () => {
    renderPanel(baseThread());
    const panel = screen.getByTestId("lead-panel");
    expect(screen.getByTestId("lead-score")).toHaveTextContent("72");
    expect(screen.getByTestId("lead-score-bar")).toBeInTheDocument();
    expect(screen.getByTestId("lead-priority-stripe")).toBeInTheDocument();
    expect(screen.getByTestId("lead-panel-state-badge")).toBeInTheDocument();
    expect(screen.getByTestId("lead-panel-assignee")).toHaveTextContent("Sem responsável");

    const html = panel.innerHTML;
    const scoreIdx = html.indexOf('data-testid="lead-score"');
    const situacaoIdx = html.indexOf(">Situação<");
    expect(scoreIdx).toBeGreaterThan(-1);
    expect(situacaoIdx).toBeGreaterThan(-1);
    expect(scoreIdx).toBeLessThan(situacaoIdx);
  });

  it("mantém quatro tabs e CRM com score duplicado (C4)", async () => {
    const user = userEvent.setup();
    renderPanel(baseThread());
    expect(screen.getByTestId("lead-tab-resumo")).toBeInTheDocument();
    expect(screen.getByTestId("lead-tab-proxima")).toBeInTheDocument();
    expect(screen.getByTestId("lead-tab-crm")).toBeInTheDocument();
    expect(screen.getByTestId("lead-tab-contexto")).toBeInTheDocument();

    await user.click(screen.getByTestId("lead-tab-crm"));
    expect(screen.getByTestId("lead-score-panel-crm-tab")).toBeInTheDocument();
    expect(screen.getByTestId("lead-score")).toHaveTextContent("72");
    expect(screen.getByText("Plano Pro")).toBeInTheDocument();
    expect(screen.getByText(/Funil \(IA\)/)).toBeInTheDocument();
  });

  it("operador sem platform_admin não vê Prospect", async () => {
    const user = userEvent.setup();
    renderPanel(baseThread());
    await user.click(screen.getByTestId("lead-tab-crm"));
    expect(screen.queryByTestId("devflow-prospect-panel")).not.toBeInTheDocument();
  });

  it("platform_admin vê Prospect na tab CRM", async () => {
    const user = userEvent.setup();
    mockSessionRole.mockReturnValue({ role: "platform_admin", tenantId: "t1", loading: false });
    renderPanel(baseThread());
    await user.click(screen.getByTestId("lead-tab-crm"));
    expect(screen.getByTestId("devflow-prospect-panel")).toBeInTheDocument();
  });

  it("evaluationMode esconde Prospect mesmo para platform_admin", async () => {
    const user = userEvent.setup();
    mockSessionRole.mockReturnValue({ role: "platform_admin", tenantId: "t1", loading: false });
    renderPanel(baseThread(), true);
    await user.click(screen.getByTestId("lead-tab-crm"));
    expect(screen.queryByTestId("devflow-prospect-panel")).not.toBeInTheDocument();
  });

  it("sugestões textuais distinguem-se do Playbook", async () => {
    const user = userEvent.setup();
    renderPanel(baseThread({ aiState: "qualifying" }));
    await user.click(screen.getByTestId("lead-tab-proxima"));
    expect(screen.getByText(/Playbook ou IA no composer/)).toBeInTheDocument();
    await user.click(screen.getByTestId("lead-tab-contexto"));
    expect(screen.getByText(/distinta do Playbook do composer/)).toBeInTheDocument();
    expect(screen.getByTestId("operator-suggestion")).toBeInTheDocument();
  });

  it("lead parcial: sem prioridade e leadData vazio", async () => {
    const user = userEvent.setup();
    renderPanel(
      baseThread({
        priority: undefined,
        leadScore: 0,
        leadData: null,
        aiState: null,
      })
    );
    expect(screen.getByTestId("lead-score")).toHaveTextContent("0");
    expect(screen.queryByTestId("lead-priority-stripe")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("lead-tab-crm"));
    expect(screen.getByText(/Ainda não há dados extraídos/)).toBeInTheDocument();
  });

  it("CLOSED mostra responsável —", () => {
    renderPanel(baseThread({ status: "CLOSED", assignedToUser: null }));
    expect(screen.getByTestId("lead-panel-assignee")).toHaveTextContent("—");
  });
});
