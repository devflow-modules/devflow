/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatHeader } from "../ChatHeader";
import type { WaInboxThreadRow } from "../inboxTypes";
import type { UserRole } from "@/modules/auth";

const mockAssignConversation = vi.fn();
const mockInvalidateQueries = vi.fn();

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

vi.mock("../inboxFetch", async () => {
  const actual = await vi.importActual<typeof import("../inboxFetch")>("../inboxFetch");
  return {
    ...actual,
    assignConversation: (...args: unknown[]) => mockAssignConversation(...args),
    updateConversationStatus: vi.fn(),
    fetchInboxTags: vi.fn().mockResolvedValue([]),
    fetchInboxUsers: vi.fn().mockResolvedValue([
      { id: "u2", name: "Bruno", email: "b@x.com" },
    ]),
    fetchInboxOperationalQueues: vi.fn().mockResolvedValue([]),
    fetchInboxTeam: vi.fn().mockResolvedValue([]),
  };
});

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

function baseThread(partial: Partial<WaInboxThreadRow>): WaInboxThreadRow {
  return {
    id: "thread-1",
    phoneNumber: "5511999999999",
    businessPhoneNumberId: "pn-meta-1",
    contactName: "Cliente",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    lastMessagePreview: "x",
    status: "OPEN",
    conversationState: "awaiting_agent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

function renderHeader(thread: WaInboxThreadRow) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.invalidateQueries = mockInvalidateQueries;
  return render(
    <QueryClientProvider client={qc}>
      <ChatHeader threadId={thread.id} thread={thread} onAuditTabChange={vi.fn()} />
    </QueryClientProvider>
  );
}

describe("ChatHeader assignment policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssignConversation.mockResolvedValue(undefined);
    mockSessionRole.mockReturnValue({ role: "operator", tenantId: "t1", loading: false });
  });

  afterEach(() => cleanup());

  it("mostra Assumir só sem responsável", async () => {
    renderHeader(
      baseThread({
        assignedToUser: null,
        isUnassigned: true,
        isAssignedToMe: false,
      })
    );
    expect(await screen.findByTestId("header-assume")).toBeInTheDocument();

    cleanup();
    renderHeader(
      baseThread({
        assignedToUser: { id: "u2", name: "Bruno", email: "b@x.com" },
        isUnassigned: false,
        isAssignedToMe: false,
      })
    );
    await waitFor(() => {
      expect(screen.queryByTestId("header-assume")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("header-assignee-readonly")).toBeInTheDocument();
  });

  it("owner vê Liberar; operador terceiro não", async () => {
    renderHeader(
      baseThread({
        assignedToUser: { id: "u1", name: "Ana", email: "a@x.com" },
        isUnassigned: false,
        isAssignedToMe: true,
      })
    );
    expect(await screen.findByTestId("header-release")).toBeInTheDocument();

    cleanup();
    renderHeader(
      baseThread({
        assignedToUser: { id: "u2", name: "Bruno", email: "b@x.com" },
        isUnassigned: false,
        isAssignedToMe: false,
      })
    );
    await waitFor(() => {
      expect(screen.queryByTestId("header-release")).not.toBeInTheDocument();
    });
  });

  it("manager pode abrir menu em conversa alheia", async () => {
    mockSessionRole.mockReturnValue({ role: "manager", tenantId: "t1", loading: false });
    renderHeader(
      baseThread({
        assignedToUser: { id: "u2", name: "Bruno", email: "b@x.com" },
        isUnassigned: false,
        isAssignedToMe: false,
      })
    );
    expect(await screen.findByTestId("header-assignee-menu")).toBeInTheDocument();
    expect(screen.getByTestId("header-release")).toBeInTheDocument();
  });

  it("CLOSED não mostra Assumir/Liberar nem menu de ownership", async () => {
    renderHeader(
      baseThread({
        status: "CLOSED",
        conversationState: "closed",
        assignedToUser: { id: "u1", name: "Ana", email: "a@x.com" },
        isUnassigned: false,
        isAssignedToMe: true,
      })
    );
    await waitFor(() => {
      expect(screen.queryByTestId("header-assume")).not.toBeInTheDocument();
      expect(screen.queryByTestId("header-release")).not.toBeInTheDocument();
      expect(screen.queryByTestId("header-assignee-menu")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("header-assignee-readonly")).toBeInTheDocument();
  });

  it("erro de assign é acessível e limpa na nova tentativa", async () => {
    const user = userEvent.setup();
    mockAssignConversation
      .mockRejectedValueOnce(new Error("Conflito: já atribuída"))
      .mockResolvedValueOnce(undefined);

    renderHeader(
      baseThread({
        assignedToUser: null,
        isUnassigned: true,
        isAssignedToMe: false,
      })
    );
    await user.click(await screen.findByTestId("header-assume"));
    const alert = await screen.findByTestId("header-assign-error");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveTextContent(/Conflito/);

    await user.click(screen.getByTestId("header-assume"));
    await waitFor(() => {
      expect(screen.queryByTestId("header-assign-error")).not.toBeInTheDocument();
    });
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });
});
