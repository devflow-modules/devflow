import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { OPS_METRICS_KEY_HEADER } from "@/lib/ops-metrics-guard";

vi.mock("@/modules/inbox/waInboxOpsMetrics", () => ({
  countTenantsTotal: vi.fn().mockResolvedValue(0),
  countInboxThreadsTotal: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/modules/messaging/waInboxMessageStats", () => ({
  countMessagesLast24h: vi.fn().mockResolvedValue(0),
}));

describe("GET /api/ops/metrics", () => {
  beforeEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function req(headers?: Record<string, string>) {
    return new NextRequest("http://localhost/api/ops/metrics", { headers });
  }

  it("retorna payload com product e campos do contrato", async () => {
    const { GET } = await import("../route");
    const res = await GET(req());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.product).toBe("whatsapp-platform");
    expect(typeof data.users).toBe("number");
    expect(typeof data.activeSubscriptions).toBe("number");
    expect(typeof data.pendingCancellation).toBe("number");
    expect(typeof data.mrr).toBe("number");
    expect(typeof data.tenants).toBe("number");
    expect(typeof data.conversations).toBe("number");
    expect(typeof data.messagesLast24h).toBe("number");
    expect(typeof data.trace_id).toBe("string");
    expect(res.headers.get("X-Trace-Id")).toBe(data.trace_id);
  });

  it("retorna 401 quando o secret está definido mas o header falta ou é inválido", async () => {
    vi.stubEnv("WHATSAPP_OPS_METRICS_SECRET", "ops-test-secret");
    vi.resetModules();
    const { GET } = await import("../route");

    const noHeader = await GET(req());
    expect(noHeader.status).toBe(401);
    const errBody = (await noHeader.json()) as { success: boolean; error?: { code: string } };
    expect(errBody.success).toBe(false);
    expect(errBody.error?.code).toBe("OPS_METRICS_UNAUTHORIZED");

    const bad = await GET(req({ [OPS_METRICS_KEY_HEADER]: "wrong" }));
    expect(bad.status).toBe(401);

    const ok = await GET(req({ [OPS_METRICS_KEY_HEADER]: "ops-test-secret" }));
    expect(ok.status).toBe(200);
  });

  it("em produção sem secret configurado retorna 503", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WHATSAPP_OPS_METRICS_SECRET", "");
    vi.resetModules();
    const { GET } = await import("../route");
    const res = await GET(req());
    expect(res.status).toBe(503);
  });
});
