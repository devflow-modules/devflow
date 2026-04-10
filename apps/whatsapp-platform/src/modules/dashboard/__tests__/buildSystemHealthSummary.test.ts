import { describe, it, expect } from "vitest";
import { buildSystemHealthSummary } from "../buildSystemHealthSummary";
import type { SystemHealthSnapshot } from "../systemHealthService";

function baseSnap(over: Partial<SystemHealthSnapshot> = {}): SystemHealthSnapshot {
  const base: SystemHealthSnapshot = {
    channelStatus: {
      displayPhone: "+55 11",
      phoneConnected: true,
      lastInboundAt: new Date().toISOString(),
      lastOutboundAt: new Date().toISOString(),
      inboxActivityRecent: true,
    },
    webhookHealth: {
      status: "ok",
      label: "Webhook ativo",
      detail: "ok",
      lastReceivedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      lastErrorAt: null,
      totalReceived: 10,
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
    taskCounts: { followUpPending: 0, reactivationPending: 0, recoveryPending: 0 },
    errorSummary: { count24h: 0, lastThree: [] },
    criticalLogs: [],
  };
  return { ...base, ...over };
}

describe("buildSystemHealthSummary", () => {
  it("ok quando canal e erros limpos", () => {
    const s = buildSystemHealthSummary(baseSnap());
    expect(s.overall).toBe("ok");
    expect(s.message).toContain("normalmente");
  });

  it("erro quando número não conectado", () => {
    const s = buildSystemHealthSummary(
      baseSnap({
        channelStatus: {
          displayPhone: null,
          phoneConnected: false,
          lastInboundAt: null,
          lastOutboundAt: null,
          inboxActivityRecent: false,
        },
      })
    );
    expect(s.overall).toBe("error");
    expect(s.message).toContain("crítico");
  });

  it("atenção com erros recentes", () => {
    const s = buildSystemHealthSummary(
      baseSnap({
        errorSummary: { count24h: 2, lastThree: [] },
      })
    );
    expect(s.overall).toBe("attention");
  });

  it("erro crítico com volume alto de erros", () => {
    const s = buildSystemHealthSummary(
      baseSnap({
        errorSummary: { count24h: 10, lastThree: [] },
      })
    );
    expect(s.overall).toBe("error");
  });

  it("atenção quando webhook classificado como erro", () => {
    const s = buildSystemHealthSummary(
      baseSnap({
        webhookHealth: {
          status: "error",
          label: "Webhook inativo",
          detail: "x",
          lastReceivedAt: null,
          lastSuccessAt: null,
          lastErrorAt: new Date().toISOString(),
          totalReceived: 0,
          totalErrors: 1,
        },
      })
    );
    expect(s.overall).toBe("error");
    expect(s.message).toContain("Webhook");
  });
});
