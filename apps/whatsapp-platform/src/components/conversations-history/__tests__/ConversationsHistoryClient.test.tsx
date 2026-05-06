/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationsHistoryClient } from "../ConversationsHistoryClient";
import * as protectedFetch from "@/lib/protected-fetch";

const nav = vi.hoisted(() => {
  let query = "";
  return {
    getQuery: () => query,
    setQuery: (q: string) => {
      query = q;
    },
    replaceMock: vi.fn((href: string) => {
      const i = href.indexOf("?");
      nav.setQuery(i >= 0 ? href.slice(i + 1) : "");
    }),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/conversations",
  useRouter: () => ({ replace: nav.replaceMock }),
  useSearchParams: () => new URLSearchParams(nav.getQuery()),
}));

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function jsonThreads(threads: unknown[], total: number) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        success: true,
        data: { threads, pagination: { limit: 100, offset: 0, total } },
      }),
  }) as ReturnType<typeof protectedFetch.fetchProtected>;
}

const threadRow = (over: Record<string, unknown> = {}) => ({
  id: "th-1",
  phoneNumber: "+351910000000",
  businessPhoneNumberId: "pn1",
  contactName: "Cliente A",
  lastMessageAt: "2026-04-01T12:00:00.000Z",
  unreadCount: 0,
  lastMessagePreview: "Olá",
  status: "CLOSED",
  conversationState: "closed",
  createdAt: "2026-04-01T10:00:00.000Z",
  updatedAt: "2026-04-01T12:00:00.000Z",
  ...over,
});

function renderHistory() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ConversationsHistoryClient />
    </QueryClientProvider>
  );
}

function jsonLines(lines: unknown[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: lines }),
  }) as ReturnType<typeof protectedFetch.fetchProtected>;
}

describe("ConversationsHistoryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.setQuery("");
  });

  it("renderiza título, subtítulo de consulta, filtro de status e link Voltar para Inbox", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([], 0);
    });

    renderHistory();

    expect(screen.getByTestId("conversations-history-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Histórico de conversas" })).toBeInTheDocument();
    expect(
      screen.getByText(/Consulte conversas encerradas, atendimentos anteriores e registros para auditoria operacional/)
    ).toBeInTheDocument();
    expect(screen.getByTestId("history-filter-phase")).toBeInTheDocument();
    const back = screen.getByRole("link", { name: "Voltar para Inbox" });
    expect(back).toHaveAttribute("href", "/inbox");
  });

  it("não usa redirect: pedido à API de histórico com phase=closed por omissão", async () => {
    const spy = vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        expect(u).toContain("phase=closed");
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([], 0);
    });

    renderHistory();

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });

  it("estado vazio para encerradas sem resultados", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([], 0);
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByTestId("history-empty-closed")).toBeInTheDocument();
    });
    expect(screen.getByText("Nenhuma conversa encerrada ainda")).toBeInTheDocument();
  });

  it("lista threads e preview com Abrir na Inbox", async () => {
    const user = userEvent.setup();
    const t = threadRow();
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        return jsonThreads([t], 1);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([t], 1);
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByTestId("history-thread-list")).toBeInTheDocument();
    });

    const rowBtn = screen.getByRole("button", { name: /Cliente A|\+351910000000/ });
    await user.click(rowBtn);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Abrir na Inbox" })).toHaveAttribute(
        "href",
        "/inbox?thread=th-1"
      );
    });
  });

  it("mostra chip de linha na lista e no painel ao seleccionar", async () => {
    const user = userEvent.setup();
    const t = threadRow({
      whatsappLine: {
        phoneNumberId: "pn-pros",
        label: null,
        displayPhoneNumber: "+351 910 000 002",
        isPrimary: false,
        isDefaultOutbound: false,
        status: "ACTIVE",
        purpose: "PROSPECTING",
      },
    });
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        return jsonThreads([t], 1);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([t], 1);
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByTestId("history-thread-list")).toBeInTheDocument();
    });
    expect(screen.getByTestId("whatsapp-line-badge")).toHaveTextContent("Prospecção");

    await user.click(screen.getByRole("button", { name: /Cliente A|\+351910000000/ }));

    await waitFor(() => {
      expect(screen.getByTestId("history-preview-line-badge")).toHaveTextContent("Prospecção");
    });
  });

  it("com duas linhas mostra filtro e envia businessPhoneNumberId na API quando na URL", async () => {
    nav.setQuery("businessPhoneNumberId=pn-pros");
    const lines = [
      {
        phoneNumberId: "pn-principal",
        label: "Principal",
        displayPhoneNumber: "+351 910 000 000",
        isPrimary: true,
        isDefaultOutbound: true,
        status: "ACTIVE",
        purpose: "GENERAL",
      },
      {
        phoneNumberId: "pn-pros",
        label: "Prospecção",
        displayPhoneNumber: "+351 910 000 001",
        isPrimary: false,
        isDefaultOutbound: false,
        status: "ACTIVE",
        purpose: "PROSPECTING",
      },
    ];
    const spy = vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        expect(u).toContain("businessPhoneNumberId=pn-pros");
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines(lines);
      }
      return jsonThreads([], 0);
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByTestId("history-filter-line")).toBeInTheDocument();
    });
    expect(screen.getByTestId("history-filter-line")).toHaveValue("pn-pros");
    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });

  it("com uma linha não mostra o select de linha", async () => {
    const oneLine = [
      {
        phoneNumberId: "only-pn",
        label: "Principal",
        displayPhoneNumber: "+351 910 000 000",
        isPrimary: true,
        isDefaultOutbound: true,
        status: "ACTIVE",
        purpose: "GENERAL",
      },
    ];
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines(oneLine);
      }
      return jsonThreads([], 0);
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByTestId("history-filter-phase")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("history-filter-line")).not.toBeInTheDocument();
  });

  it("ao escolher linha chama router.replace com businessPhoneNumberId", async () => {
    const user = userEvent.setup();
    const lines = [
      {
        phoneNumberId: "pn-a",
        label: "Linha A",
        displayPhoneNumber: null,
        isPrimary: true,
        isDefaultOutbound: false,
        status: "ACTIVE",
        purpose: "GENERAL",
      },
      {
        phoneNumberId: "pn-b",
        label: "Linha B",
        displayPhoneNumber: null,
        isPrimary: false,
        isDefaultOutbound: false,
        status: "ACTIVE",
        purpose: "SUPPORT",
      },
    ];
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines(lines);
      }
      return jsonThreads([], 0);
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByTestId("history-filter-line")).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByTestId("history-filter-line"), "pn-b");
    expect(nav.replaceMock).toHaveBeenCalledWith(
      expect.stringContaining("businessPhoneNumberId=pn-b"),
      expect.any(Object)
    );
  });

  it("inicializa phase a partir da URL", async () => {
    nav.setQuery("phase=all");
    const spy = vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        expect(u).toContain("phase=all");
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([], 0);
    });
    renderHistory();
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it("inicializa busca a partir do parâmetro search", async () => {
    nav.setQuery("search=maria");
    const spy = vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        expect(u).toContain("q=maria");
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([], 0);
    });
    renderHistory();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.getByTestId("history-search-input")).toHaveValue("maria");
  });

  it("inicializa preset LAST_7_DAYS a partir da URL", async () => {
    nav.setQuery("preset=LAST_7_DAYS");
    const spy = vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        expect(u).toMatch(/from=\d{4}-\d{2}-\d{2}/);
        expect(u).toMatch(/to=\d{4}-\d{2}-\d{2}/);
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([], 0);
    });
    renderHistory();
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it("inicializa intervalo personalizado a partir de startDate e endDate", async () => {
    nav.setQuery("preset=CUSTOM&startDate=2026-05-01&endDate=2026-05-05");
    const spy = vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        expect(u).toContain("from=2026-05-01");
        expect(u).toContain("to=2026-05-05");
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([], 0);
    });
    renderHistory();
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it("aceita alias status= na URL como phase", async () => {
    nav.setQuery("status=in_attendance");
    const spy = vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        expect(u).toContain("phase=in_attendance");
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([], 0);
    });
    renderHistory();
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it("ao mudar fase chama router.replace com phase na query", async () => {
    const user = userEvent.setup();
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines([]);
      }
      return jsonThreads([], 0);
    });
    renderHistory();
    await waitFor(() => expect(screen.getByTestId("history-filter-phase")).toBeInTheDocument());
    await user.selectOptions(screen.getByTestId("history-filter-phase"), "all");
    expect(nav.replaceMock).toHaveBeenCalledWith(expect.stringContaining("phase=all"), expect.any(Object));
  });

  it("mantém businessPhoneNumberId compatível com phase na URL", async () => {
    nav.setQuery("businessPhoneNumberId=pn-pros&phase=all");
    const lines = [
      {
        phoneNumberId: "pn-principal",
        label: "Principal",
        displayPhoneNumber: "+351 910 000 000",
        isPrimary: true,
        isDefaultOutbound: false,
        status: "ACTIVE",
        purpose: "GENERAL",
      },
      {
        phoneNumberId: "pn-pros",
        label: "Prospecção",
        displayPhoneNumber: "+351 910 000 001",
        isPrimary: false,
        isDefaultOutbound: false,
        status: "ACTIVE",
        purpose: "PROSPECTING",
      },
    ];
    const spy = vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        expect(u).toContain("businessPhoneNumberId=pn-pros");
        expect(u).toContain("phase=all");
        return jsonThreads([], 0);
      }
      if (u.includes("/api/whatsapp/phone-numbers")) {
        return jsonLines(lines);
      }
      return jsonThreads([], 0);
    });
    renderHistory();
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });
});
