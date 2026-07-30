/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SystemHealthPanel } from "../SystemHealthPanel";
import type { SystemHealthSnapshot } from "@/modules/dashboard/systemHealthService";
import type { SystemHealthSummary } from "@/modules/dashboard/buildSystemHealthSummary";
import {
  LEGACY_ADMIN_OPERATIONS_PATH,
  TENANT_OPERATIONS_PATH,
} from "../systemHealthControls";

vi.mock("@/components/navigation/SessionRoleContext", () => ({
  useSessionRole: vi.fn(),
}));

vi.mock("@/lib/protected-fetch", () => ({
  fetchProtected: vi.fn(),
  protectedApiUserMessage: (status: number, j: { error?: string }) =>
    j.error ?? `erro ${status}`,
}));

import { useSessionRole } from "@/components/navigation/SessionRoleContext";
import { fetchProtected } from "@/lib/protected-fetch";

const snapshot: SystemHealthSnapshot = {
  channelStatus: {
    displayPhone: null,
    phoneConnected: true,
    lastInboundAt: null,
    lastOutboundAt: null,
    inboxActivityRecent: false,
  },
  webhookHealth: {
    status: "ok",
    label: "OK",
    detail: "ok",
    lastReceivedAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    totalReceived: 0,
    totalErrors: 0,
  },
  operationalControls: { aiEnabled: true, automationEnabled: true },
  automationStatus: {
    aiActive: true,
    aiPausedByAdmin: false,
    automationActive: true,
    automationPausedByAdmin: false,
    aiLabel: "IA activa",
    automationLabel: "Automação activa",
  },
  taskCounts: { followUpPending: 0, reactivationPending: 0, recoveryPending: 0 },
  errorSummary: { count24h: 0, lastThree: [] },
  criticalLogs: [],
};

const summary: SystemHealthSummary = {
  overall: "ok",
  message: "Canal OK",
};

function mockRole(
  role: "manager" | "platform_admin" | "operator" | null,
  loading = false
) {
  vi.mocked(useSessionRole).mockReturnValue({
    role,
    tenantId: "t1",
    loading,
  });
}

describe("SystemHealthPanel controls (dashboard-ai F0)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("manager: vê controlos tenant, não vê worker/reprocess", () => {
    mockRole("manager");
    render(
      <SystemHealthPanel snapshot={snapshot} summary={summary} error={null} onRefresh={vi.fn()} />
    );

    expect(screen.getByTestId("health-tenant-controls")).toBeInTheDocument();
    expect(screen.getByTestId("health-control-pause-ai")).toBeEnabled();
    expect(screen.getByTestId("health-control-pause-ai").className).toMatch(/df-btn-secondary/);
    expect(screen.getByTestId("health-control-pause-ai").className).not.toMatch(/df-btn-disabled/);
    expect(screen.queryByTestId("health-platform-controls")).not.toBeInTheDocument();
    expect(screen.queryByTestId("health-control-run-worker")).not.toBeInTheDocument();
    expect(screen.queryByTestId("health-control-reprocess")).not.toBeInTheDocument();
  });

  it("platform_admin: vê tenant + worker/reprocess", () => {
    mockRole("platform_admin");
    render(
      <SystemHealthPanel snapshot={snapshot} summary={summary} error={null} onRefresh={vi.fn()} />
    );

    expect(screen.getByTestId("health-tenant-controls")).toBeInTheDocument();
    expect(screen.getByTestId("health-platform-controls")).toBeInTheDocument();
    expect(screen.getByTestId("health-control-run-worker")).toBeEnabled();
    expect(screen.getByTestId("health-control-reprocess")).toBeEnabled();
  });

  it("role loading: fail-closed — sem controlos", () => {
    mockRole(null, true);
    render(
      <SystemHealthPanel snapshot={snapshot} summary={summary} error={null} onRefresh={vi.fn()} />
    );
    expect(screen.queryByTestId("health-controls")).not.toBeInTheDocument();
  });

  it("Pausar IA chama PATCH /api/operations/tenant e nunca a rota 410", async () => {
    mockRole("manager");
    const onRefresh = vi.fn();
    let resolveFetch!: (v: Response) => void;
    const fetchPromise = new Promise<Response>((r) => {
      resolveFetch = r;
    });
    vi.mocked(fetchProtected).mockReturnValue(fetchPromise);

    const user = userEvent.setup();
    render(
      <SystemHealthPanel snapshot={snapshot} summary={summary} error={null} onRefresh={onRefresh} />
    );

    await user.click(screen.getByTestId("health-control-pause-ai"));

    expect(fetchProtected).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetchProtected).mock.calls[0]!;
    expect(url).toBe(TENANT_OPERATIONS_PATH);
    expect(url).not.toBe(LEGACY_ADMIN_OPERATIONS_PATH);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ aiEnabled: false });

    await waitFor(() => {
      expect(screen.getByTestId("health-control-pause-ai")).toHaveTextContent("A pausar…");
    });
    expect(screen.getByTestId("health-control-resume-ai")).toBeDisabled();

    resolveFetch(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId("health-control-feedback")).toHaveTextContent("Alteração guardada.");
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it("erro de API mostra feedback e reabilita botões", async () => {
    mockRole("manager");
    vi.mocked(fetchProtected).mockResolvedValue(
      new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const user = userEvent.setup();
    render(
      <SystemHealthPanel snapshot={snapshot} summary={summary} error={null} onRefresh={vi.fn()} />
    );

    await user.click(screen.getByTestId("health-control-pause-ai"));

    await waitFor(() => {
      expect(screen.getByTestId("health-control-feedback")).toHaveTextContent("Sem permissão");
    });
    expect(screen.getByTestId("health-control-pause-ai")).toBeEnabled();
  });

  it("previne clique duplicado enquanto o pedido está em curso", async () => {
    mockRole("manager");
    let resolveFetch!: (v: Response) => void;
    vi.mocked(fetchProtected).mockReturnValue(
      new Promise<Response>((r) => {
        resolveFetch = r;
      })
    );

    const user = userEvent.setup();
    render(
      <SystemHealthPanel snapshot={snapshot} summary={summary} error={null} onRefresh={vi.fn()} />
    );

    const pause = screen.getByTestId("health-control-pause-ai");
    await user.click(pause);
    await user.click(pause);
    await user.click(pause);

    expect(fetchProtected).toHaveBeenCalledTimes(1);

    resolveFetch(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await waitFor(() => {
      expect(screen.getByTestId("health-control-feedback")).toBeInTheDocument();
    });
  });
});
