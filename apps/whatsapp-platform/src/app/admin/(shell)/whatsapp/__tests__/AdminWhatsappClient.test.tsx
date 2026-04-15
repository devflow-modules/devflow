/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminWhatsappClient } from "../AdminWhatsappClient";
import * as protectedFetch from "@/lib/protected-fetch";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
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

const metricsOk = {
  success: true,
  data: {
    total: 2,
    active: 1,
    pending: 1,
    activationRate: 50,
    avgActivationTimeMinutes: 12.4,
    slaBuckets: { ok: 1, delay: 0, critical: 0 },
  },
  error: null,
  trace_id: "x",
};

const pendingEmpty = {
  success: true,
  data: { items: [], page: 1, limit: 100, total: 0, filter: "all" },
  error: null,
  trace_id: "x",
};

const channelPending = {
  id: "c1",
  tenantId: "t1",
  tenantName: "Acme",
  phone: "+5511999990000",
  wabaId: "waba-99",
  phoneNumberId: "pn-88",
  status: "PENDING_ACTIVATION",
  hasToken: false,
  readyForOutbound: false,
  updatedAt: "2026-04-01T12:00:00.000Z",
};

const channelActive = {
  ...channelPending,
  id: "c2",
  status: "ACTIVE",
  hasToken: true,
  readyForOutbound: true,
};

function isChannelsListUrl(u: string): boolean {
  if (u.includes("/channels/pending")) return false;
  return u.includes("/api/admin/whatsapp/channels");
}

describe("AdminWhatsappClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza tabela com estado e coluna pronta para envio", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/metrics")) return jsonResponse(metricsOk);
      if (u.includes("/channels/pending")) return jsonResponse(pendingEmpty);
      if (isChannelsListUrl(u)) {
        return jsonResponse({
          success: true,
          data: { channels: [channelPending, channelActive] },
          error: null,
          trace_id: "x",
        });
      }
      if (u.includes("/tenants")) {
        return jsonResponse({
          success: true,
          data: { tenants: [{ id: "t1", name: "Acme" }] },
          error: null,
          trace_id: "x",
        });
      }
      return jsonResponse({}, false, 404);
    });

    render(<AdminWhatsappClient />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-whatsapp-channels-table")).toBeInTheDocument();
    });

    expect(screen.getByTestId("channel-row-c1")).toHaveAttribute("data-status", "PENDING_ACTIVATION");
    expect(screen.getByText("❌ Não ativo")).toBeInTheDocument();
    expect(screen.getByText("✅ Pronto")).toBeInTheDocument();
  });

  it("filtra por estado", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/metrics")) return jsonResponse(metricsOk);
      if (u.includes("/channels/pending")) return jsonResponse(pendingEmpty);
      if (isChannelsListUrl(u)) {
        return jsonResponse({
          success: true,
          data: { channels: [channelPending, channelActive] },
          error: null,
          trace_id: "x",
        });
      }
      if (u.includes("/tenants")) {
        return jsonResponse({
          success: true,
          data: { tenants: [] },
          error: null,
          trace_id: "x",
        });
      }
      return jsonResponse({}, false, 404);
    });

    const user = userEvent.setup();
    render(<AdminWhatsappClient />);

    await waitFor(() => expect(screen.getByTestId("channel-row-c1")).toBeInTheDocument());

    await user.selectOptions(screen.getByTestId("channel-status-filter"), "ACTIVE");
    expect(screen.queryByTestId("channel-row-c1")).not.toBeInTheDocument();
    expect(screen.getByTestId("channel-row-c2")).toBeInTheDocument();
  });

  it("provisionamento: POST manual e atualização da lista", async () => {
    const fetchMock = vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/metrics")) return jsonResponse(metricsOk);
      if (u.includes("/channels/pending")) return jsonResponse(pendingEmpty);
      if (isChannelsListUrl(u)) {
        return jsonResponse({
          success: true,
          data: { channels: [] },
          error: null,
          trace_id: "x",
        });
      }
      if (u.includes("/tenants")) {
        return jsonResponse({
          success: true,
          data: { tenants: [{ id: "t1", name: "Acme" }] },
          error: null,
          trace_id: "x",
        });
      }
      if (u.includes("/channel/manual")) {
        return jsonResponse({
          success: true,
          data: {
            channelId: "new1",
            tenantId: "t1",
            phoneNumberId: "pn-new",
            status: "PENDING_ACTIVATION",
          },
          error: null,
          trace_id: "x",
        });
      }
      return jsonResponse({}, false, 404);
    });

    const user = userEvent.setup();
    render(<AdminWhatsappClient />);

    await waitFor(() => expect(screen.getByTestId("provision-tenant-select")).toBeInTheDocument());
    await waitFor(() => {
      const sel = screen.getByTestId("provision-tenant-select");
      expect(sel.querySelector('option[value="t1"]')).not.toBeNull();
    });

    await user.selectOptions(screen.getByTestId("provision-tenant-select"), "t1");
    await user.type(screen.getByTestId("provision-phone"), "+5511888777666");
    await user.type(screen.getByTestId("provision-waba"), "waba-x");
    await user.type(screen.getByTestId("provision-phone-number-id"), "pn-new");

    await user.click(screen.getByRole("button", { name: /Provisionar canal/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/whatsapp/channel/manual",
        expect.objectContaining({ method: "POST" })
      );
    });

    const manualCall = fetchMock.mock.calls.find((c) => String(c[0]).includes("manual"));
    expect(manualCall).toBeDefined();
    const body = JSON.parse((manualCall![1] as RequestInit).body as string);
    expect(body).toMatchObject({
      tenantId: "t1",
      phone: "+5511888777666",
      wabaId: "waba-x",
      phoneNumberId: "pn-new",
    });
  });

  it("ativação: modal e POST activate", async () => {
    vi.spyOn(protectedFetch, "fetchProtected").mockImplementation((input: RequestInfo | URL) => {
      const u = requestUrl(input);
      if (u.includes("/metrics")) return jsonResponse(metricsOk);
      if (u.includes("/channels/pending")) return jsonResponse(pendingEmpty);
      if (isChannelsListUrl(u)) {
        return jsonResponse({
          success: true,
          data: { channels: [channelPending] },
          error: null,
          trace_id: "x",
        });
      }
      if (u.includes("/tenants")) {
        return jsonResponse({
          success: true,
          data: { tenants: [] },
          error: null,
          trace_id: "x",
        });
      }
      if (u.includes("/channel/activate")) {
        return jsonResponse({
          success: true,
          data: { channelId: "c1", status: "ACTIVE" },
          error: null,
          trace_id: "x",
        });
      }
      return jsonResponse({}, false, 404);
    });

    const user = userEvent.setup();
    render(<AdminWhatsappClient />);

    await waitFor(() => expect(screen.getByTestId("channel-row-c1")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^Ativar$/ }));

    const dialog = await screen.findByRole("dialog");
    const ta = within(dialog).getByPlaceholderText(/token/i);
    await user.type(ta, "012345678901234567890");

    await user.click(within(dialog).getByRole("button", { name: /^Ativar$/ }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Canal ativado com sucesso/)).toBeInTheDocument();
  });
});
