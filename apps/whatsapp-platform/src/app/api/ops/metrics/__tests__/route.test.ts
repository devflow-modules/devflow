import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { OPS_METRICS_KEY_HEADER } from "@/lib/ops-metrics-guard";

vi.mock("@/lib/supabase-server", () => ({
  hasSupabaseConfig: vi.fn(),
}));
vi.mock("@/modules/tenants", () => ({ countTenants: vi.fn() }));
vi.mock("@/modules/conversations", () => ({ countConversations: vi.fn() }));
vi.mock("@/modules/messaging", () => ({ countMessagesLast24h: vi.fn() }));

describe("GET /api/ops/metrics", () => {
  beforeEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { hasSupabaseConfig } = await import("@/lib/supabase-server");
    vi.mocked(hasSupabaseConfig).mockReturnValue(false);
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
  });

  it("retorna zeros quando Supabase não está configurado", async () => {
    const { GET } = await import("../route");
    const res = await GET(req());
    const data = await res.json();
    expect(data.tenants).toBe(0);
    expect(data.conversations).toBe(0);
    expect(data.messagesLast24h).toBe(0);
  });

  it("retorna 401 quando o secret está definido mas o header falta ou é inválido", async () => {
    vi.stubEnv("WHATSAPP_OPS_METRICS_SECRET", "ops-test-secret");
    vi.resetModules();
    const { hasSupabaseConfig } = await import("@/lib/supabase-server");
    vi.mocked(hasSupabaseConfig).mockReturnValue(false);
    const { GET } = await import("../route");

    const noHeader = await GET(req());
    expect(noHeader.status).toBe(401);

    const bad = await GET(
      req({ [OPS_METRICS_KEY_HEADER]: "wrong" })
    );
    expect(bad.status).toBe(401);

    const ok = await GET(
      req({ [OPS_METRICS_KEY_HEADER]: "ops-test-secret" })
    );
    expect(ok.status).toBe(200);
  });

  it("em produção sem secret configurado retorna 503", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WHATSAPP_OPS_METRICS_SECRET", "");
    vi.resetModules();
    const { hasSupabaseConfig } = await import("@/lib/supabase-server");
    vi.mocked(hasSupabaseConfig).mockReturnValue(false);
    const { GET } = await import("../route");
    const res = await GET(req());
    expect(res.status).toBe(503);
  });
});
