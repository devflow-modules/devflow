/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InboxShell } from "../InboxShell";
import { Button } from "@/components/ui/button";

const replace = vi.fn();
const searchParamsStore = vi.hoisted(() => {
  let query = "";
  return {
    getQuery: () => query,
    setQuery: (q: string) => {
      query = q.startsWith("?") ? q.slice(1) : q;
    },
    clear: () => {
      query = "";
    },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/inbox",
  useRouter: () => ({
    replace: (href: string) => {
      const i = href.indexOf("?");
      searchParamsStore.setQuery(i >= 0 ? href.slice(i + 1) : "");
      replace(href);
    },
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => {
    const params = new URLSearchParams(searchParamsStore.getQuery());
    return {
      get: (key: string) => params.get(key),
      toString: () => params.toString(),
    };
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../useMediaMd", () => ({
  useMediaMd: () => true,
}));

vi.mock("../useInboxRealtime", () => ({
  InboxRealtimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useInboxRealtime: () => ({ connected: true }),
}));

vi.mock("@/components/navigation/SessionRoleContext", () => ({
  useSessionRole: () => ({ role: "agent", tenantId: "t1", loading: false }),
}));

vi.mock("@/components/shell/ShellLayoutContext", () => ({
  useShellLayoutOptional: () => null,
}));

vi.mock("@/lib/productMode", () => ({
  isWhiteLabelMode: () => true,
}));

vi.mock("@/lib/devflowProspecting", () => ({
  isDevFlowProspectingEnabled: () => false,
}));

vi.mock("@/lib/activationStorage", () => ({
  dismissFirstReplyBanner: vi.fn(),
  ensureFirstMessageActivationLogged: vi.fn(),
  getActivationState: () => ({
    firstMessageToastSeen: true,
    firstReplyToastSeen: true,
    firstReplyBannerDismissed: true,
  }),
  markFirstMessageToastSeen: vi.fn(),
  markFirstReplyToastSeen: vi.fn(),
}));

vi.mock("@/lib/protected-fetch", () => ({
  fetchProtected: vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, data: null }),
  })),
}));

vi.mock("../inboxFetch", () => ({
  fetchInboxConversations: vi.fn(async () => ({
    threads: [],
    pagination: { limit: 100, offset: 0, total: 0 },
  })),
  fetchInboxOperationalQueues: vi.fn(async () => []),
  fetchInboxProspectMetrics: vi.fn(async () => null),
  fetchTenantWhatsappLines: vi.fn(async () => []),
  fetchInboxMetrics: vi.fn(async () => ({
    avgQueueWaitSeconds: null,
    avgHandleSeconds: null,
    sampleQueue: 0,
    sampleHandle: 0,
    conversationsByAgent: [],
  })),
  fetchInboxTeam: vi.fn(async () => []),
  fetchInboxQueueNext: vi.fn(async () => ({ thread: null })),
  fetchOnlineUsers: vi.fn(async () => []),
}));

vi.mock("../ConversationsList", () => ({
  ConversationsList: (props: {
    searchQuery?: string;
    onSearchQueryChange?: (q: string) => void;
  }) => (
    <div data-testid="conversations-list-stub">
      <span data-testid="shell-search-query">{props.searchQuery ?? ""}</span>
      <Button
        type="button"
        variant="secondary"
        data-testid="shell-search-trigger"
        onClick={() => props.onSearchQueryChange?.("Maria")}
      >
        buscar
      </Button>
      <Button
        type="button"
        variant="secondary"
        data-testid="shell-search-clear"
        onClick={() => props.onSearchQueryChange?.("")}
      >
        limpar
      </Button>
    </div>
  ),
}));

vi.mock("../ChatWindow", () => ({
  ChatWindow: () => <div data-testid="chat-window-stub">chat</div>,
}));

vi.mock("../FirstConversationHint", () => ({
  FirstConversationHint: () => null,
}));

vi.mock("@/components/support/SupportHelpButton", () => ({
  SupportHelpButton: () => <span data-testid="support-help-stub">Ajuda</span>,
}));

function renderShell() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <InboxShell />
    </QueryClientProvider>
  );
}

describe("InboxShell Fatia 6", () => {
  beforeEach(() => {
    localStorage.clear();
    searchParamsStore.clear();
    replace.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("métricas ficam em details fechado por padrão (S6-1 A)", async () => {
    renderShell();
    await waitFor(() => {
      expect(screen.getByTestId("inbox-shell")).toBeInTheDocument();
    });
    const details = screen.getByTestId("inbox-metrics-details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(screen.getByText("Métricas e equipa")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-metrics-panel")).toBeInTheDocument();
  });

  it("modo foco permanece opt-in e aria-pressed falso por padrão (S6-2 A)", async () => {
    renderShell();
    const toggle = await screen.findByTestId("inbox-focus-toggle");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveTextContent("Modo foco");
    expect(screen.getByTestId("inbox-metrics-details")).toBeInTheDocument();
  });

  it("activar modo foco esconde o bloco de métricas", async () => {
    const user = userEvent.setup();
    renderShell();
    const toggle = await screen.findByTestId("inbox-focus-toggle");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByTestId("inbox-metrics-details")).not.toBeInTheDocument();
    expect(localStorage.getItem("df-inbox-focus-mode")).toBe("1");
  });

  it("busca: escreve q na URL e limpar remove o termo", async () => {
    const user = userEvent.setup();
    renderShell();
    await waitFor(() => {
      expect(screen.getByTestId("conversations-list-stub")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("shell-search-trigger"));
    await waitFor(() => {
      expect(replace).toHaveBeenCalled();
      const href = String(replace.mock.calls.at(-1)?.[0] ?? "");
      expect(href).toContain("q=Maria");
      expect(screen.getByTestId("shell-search-query")).toHaveTextContent("Maria");
    });
    await user.click(screen.getByTestId("shell-search-clear"));
    await waitFor(() => {
      const href = String(replace.mock.calls.at(-1)?.[0] ?? "");
      expect(href).not.toContain("q=");
      expect(screen.getByTestId("shell-search-query")).toHaveTextContent("");
    });
  });

  it("busca: lê q da query string no refresh", async () => {
    searchParamsStore.setQuery("q=Pedro");
    renderShell();
    await waitFor(() => {
      expect(screen.getByTestId("shell-search-query")).toHaveTextContent("Pedro");
    });
  });
});