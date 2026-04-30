/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationsHistoryClient } from "../ConversationsHistoryClient";
import * as protectedFetch from "@/lib/protected-fetch";

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

describe("ConversationsHistoryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza título, subtítulo de consulta, filtro de status e link Voltar para Inbox", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/inbox/conversations")) {
        return jsonThreads([], 0);
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
      return jsonThreads([], 0);
    });

    renderHistory();

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });

  it("estado vazio para encerradas sem resultados", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      if (requestUrl(input).includes("/api/inbox/conversations")) {
        return jsonThreads([], 0);
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
      if (requestUrl(input).includes("/api/inbox/conversations")) {
        return jsonThreads([t], 1);
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
});
