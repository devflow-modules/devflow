/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { WhatsappConnectClient } from "../WhatsappConnectClient";
import * as protectedFetch from "@/lib/protected-fetch";
import { useSearchParams } from "next/navigation";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/components/support/SupportProvider", () => ({
  useSupport: () => ({ openSupport: vi.fn() }),
  SupportProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function jsonResponse<T>(body: T, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as ReturnType<typeof protectedFetch.fetchProtected>;
}

const row = (over: Record<string, unknown> = {}) => ({
  id: "r1",
  phoneNumberId: "pn1",
  displayPhoneNumber: "+351 910 111 111",
  wabaId: "waba",
  status: "ACTIVE",
  isPrimary: false,
  isDefaultOutbound: false,
  label: "Suporte",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("WhatsappConnectClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>);
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/whatsapp/phone-numbers") && !u.includes("/phone-numbers/")) {
        return jsonResponse({ data: [] });
      }
      return jsonResponse({});
    });
  });

  it("estado vazio: mostra StateEmpty e resumo sem canal ligado", async () => {
    render(<WhatsappConnectClient />);
    await waitFor(() => {
      expect(screen.getByText("Você ainda não conectou seu WhatsApp")).toBeInTheDocument();
    });
    expect(screen.getByText("Sem número ligado")).toBeInTheDocument();
    expect(screen.getAllByText("Ainda não definido").length).toBeGreaterThanOrEqual(2);
  });

  it("sucesso OAuth: mostra banner e remove query (replaceState)", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("?success=1") as ReturnType<typeof useSearchParams>);

    render(<WhatsappConnectClient />);

    await waitFor(() => {
      expect(screen.getByText("WhatsApp conectado com sucesso")).toBeInTheDocument();
    });
    expect(replaceState).toHaveBeenCalledWith({}, "", "/dashboard/whatsapp");
    replaceState.mockRestore();
  });

  it("lista com badges e próximos passos quando há números", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/whatsapp/phone-numbers") && !u.includes("/phone-numbers/")) {
        return jsonResponse({
          data: [
            row({ id: "a", isPrimary: true, isDefaultOutbound: false }),
            row({
              id: "b",
              phoneNumberId: "pn2",
              displayPhoneNumber: "+351 910 222 222",
              isPrimary: false,
              isDefaultOutbound: true,
              label: "Vendas",
            }),
          ],
        });
      }
      return jsonResponse({});
    });

    render(<WhatsappConnectClient />);

    await waitFor(() => {
      expect(screen.getByText("Números ligados")).toBeInTheDocument();
    });

    const principals = screen.getAllByText("Número principal");
    expect(principals.length).toBeGreaterThanOrEqual(1);
    const defaults = screen.getAllByText("Envio padrão");
    expect(defaults.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Próximos passos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Responder mensagens/i })).toHaveAttribute("href", "/inbox");
  });

  it("pending_activation: mostra card de aguardar Meta", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/whatsapp/phone-numbers") && !u.includes("/phone-numbers/")) {
        return jsonResponse({
          data: [
            row({
              status: "PENDING_ACTIVATION",
              isPrimary: true,
              isDefaultOutbound: true,
            }),
          ],
        });
      }
      if (u.includes("/api/billing/ui")) {
        return jsonResponse({ success: true, data: { plan: "STARTER" } });
      }
      return jsonResponse({});
    });

    render(<WhatsappConnectClient />);

    await waitFor(() => {
      expect(screen.getByText("Seu número já está configurado")).toBeInTheDocument();
    });
    expect(screen.getByText("Aguardando ativação")).toBeInTheDocument();
  });

  it("resumo com vários números: mostra linha de contexto", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/api/whatsapp/phone-numbers") && !u.includes("/phone-numbers/")) {
        return jsonResponse({
          data: [
            row({ id: "a", isPrimary: false, isDefaultOutbound: false }),
            row({
              id: "b",
              phoneNumberId: "pn2",
              displayPhoneNumber: "+351 922 222 222",
              isPrimary: false,
              isDefaultOutbound: false,
            }),
          ],
        });
      }
      return jsonResponse({});
    });

    render(<WhatsappConnectClient />);

    await waitFor(() => {
      expect(screen.getByText(/2 números neste canal/)).toBeInTheDocument();
    });
  });
});
