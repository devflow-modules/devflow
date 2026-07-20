/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatHeader } from "../ChatHeader";
import type { WaInboxThreadRow } from "../inboxTypes";
import { INBOX_QK } from "../inboxTypes";

const mockUpdateConversationStatus = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("../inboxFetch", async () => {
  const actual = await vi.importActual<typeof import("../inboxFetch")>("../inboxFetch");
  return {
    ...actual,
    updateConversationStatus: (...args: unknown[]) => mockUpdateConversationStatus(...args),
    fetchInboxTags: vi.fn().mockResolvedValue([]),
    fetchInboxUsers: vi.fn().mockResolvedValue([]),
    fetchInboxOperationalQueues: vi.fn().mockResolvedValue([]),
    fetchInboxTeam: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@/lib/protected-fetch", () => ({
  fetchProtected: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: { user: { id: "u1", name: "Agente", email: "a@x.com", role: "operator", tenantId: "t1" } },
    }),
  }),
  isFeatureBlockedError: () => false,
}));

vi.mock("@/components/navigation/SessionRoleContext", () => ({
  useSessionRole: () => ({ role: "operator", tenantId: "t1", loading: false }),
}));

function baseThread(status: "OPEN" | "PENDING" | "CLOSED"): WaInboxThreadRow {
  return {
    id: "thread-1",
    phoneNumber: "5511999999999",
    businessPhoneNumberId: "pn-meta-1",
    contactName: "Cliente",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    lastMessagePreview: "x",
    status,
    conversationState: status === "CLOSED" ? "closed" : "awaiting_agent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function renderHeader(thread: WaInboxThreadRow) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.invalidateQueries = mockInvalidateQueries;
  return render(
    <QueryClientProvider client={qc}>
      <ChatHeader threadId={thread.id} thread={thread} onAuditTabChange={vi.fn()} />
    </QueryClientProvider>
  );
}

describe("ChatHeader status lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateConversationStatus.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("mostra header-reopen apenas para thread CLOSED", async () => {
    const { rerender } = renderHeader(baseThread("CLOSED"));
    await waitFor(() => {
      expect(screen.getByTestId("header-reopen")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("header-close")).not.toBeInTheDocument();

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      <QueryClientProvider client={qc}>
        <ChatHeader threadId="thread-1" thread={baseThread("OPEN")} onAuditTabChange={vi.fn()} />
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.queryByTestId("header-reopen")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("header-close")).toBeInTheDocument();
  });

  it("clique em reabrir envia OPEN e invalida lista/thread", async () => {
    const user = userEvent.setup();
    renderHeader(baseThread("CLOSED"));
    await user.click(await screen.findByTestId("header-reopen"));
    await waitFor(() => {
      expect(mockUpdateConversationStatus).toHaveBeenCalledWith("thread-1", "OPEN");
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["inbox-conversations"],
      exact: false,
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: INBOX_QK.thread("thread-1"),
    });
  });

  it("mostra erro acessível quando a API falha e limpa ao tentar novamente", async () => {
    const user = userEvent.setup();
    mockUpdateConversationStatus
      .mockRejectedValueOnce(new Error("Falha de rede"))
      .mockResolvedValueOnce(undefined);

    renderHeader(baseThread("CLOSED"));
    await user.click(await screen.findByTestId("header-reopen"));

    const alert = await screen.findByTestId("header-status-error");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveTextContent("Falha de rede");

    await user.click(screen.getByTestId("header-reopen"));
    await waitFor(() => {
      expect(screen.queryByTestId("header-status-error")).not.toBeInTheDocument();
    });
  });
});
