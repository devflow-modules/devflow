import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockGetSystemHealthSnapshot = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuthFromRequest(...a),
  };
});

vi.mock("@/modules/dashboard/systemHealthService", () => ({
  getSystemHealthSnapshot: (...a: unknown[]) => mockGetSystemHealthSnapshot(...a),
}));

const minimalSnapshot = {
  channelStatus: {
    displayPhone: "+1",
    phoneConnected: true,
    lastInboundAt: new Date().toISOString(),
    lastOutboundAt: new Date().toISOString(),
    inboxActivityRecent: true,
  },
  webhookHealth: {
    status: "ok" as const,
    label: "Webhook ativo",
    detail: "",
    lastReceivedAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
    lastErrorAt: null,
    totalReceived: 1,
    totalErrors: 0,
  },
  operationalControls: { aiEnabled: true, automationEnabled: true },
  automationStatus: {
    aiActive: true,
    aiPausedByAdmin: false,
    automationActive: true,
    automationPausedByAdmin: false,
    aiLabel: "IA ativa",
    automationLabel: "Automação ativa",
  },
  taskCounts: { followUpPending: 2, reactivationPending: 1, recoveryPending: 0 },
  errorSummary: { count24h: 0, lastThree: [] },
  criticalLogs: [],
};

describe("GET /api/dashboard/system-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        tenantId: "t1",
        sub: "u-manager",
        role: "manager",
      },
    });
    mockGetSystemHealthSnapshot.mockResolvedValue(minimalSnapshot);
  });

  it("retorna snapshot e summary", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest(new URL("http://localhost/api/dashboard/system-health")));
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      success: boolean;
      data: { summary: { overall: string }; snapshot: { taskCounts: { followUpPending: number } } };
    };
    expect(j.success).toBe(true);
    expect(j.data.summary.overall).toBe("ok");
    expect(j.data.snapshot.taskCounts.followUpPending).toBe(2);
    expect(mockGetSystemHealthSnapshot).toHaveBeenCalledWith("t1");
  });
});
