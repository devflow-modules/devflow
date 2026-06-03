import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resolveDemoApiResponse } from "../resolveDemoApiResponse";
import { DEMO_THREAD_PRIMARY } from "../constants";

describe("resolveDemoApiResponse", () => {
  function req(path: string, method = "GET") {
    return new NextRequest(`http://localhost:3000${path}`, { method });
  }

  it("retorna verify com utilizador demo", () => {
    const mock = resolveDemoApiResponse(req("/api/auth/verify"));
    expect(mock?.status).toBe(200);
    const body = mock?.body as { success: boolean; data: { user: { email: string } } };
    expect(body.success).toBe(true);
    expect(body.data.user.email).toContain("showcase.devflow.local");
  });

  it("retorna métricas overview", () => {
    const mock = resolveDemoApiResponse(req("/api/metrics/overview"));
    const body = mock?.body as { overview: { totalMessages: number } };
    expect(body.overview.totalMessages).toBeGreaterThan(0);
  });

  it("lista conversas inbox", () => {
    const mock = resolveDemoApiResponse(req("/api/inbox/conversations?limit=100"));
    const body = mock?.body as {
      success: boolean;
      data: { threads: { id: string }[] };
    };
    expect(body.success).toBe(true);
    expect(body.data.threads.length).toBeGreaterThanOrEqual(2);
  });

  it("retorna mensagens por thread", () => {
    const mock = resolveDemoApiResponse(
      req(`/api/inbox/conversations/${DEMO_THREAD_PRIMARY}/messages`)
    );
    const body = mock?.body as { data: { messages: unknown[] } };
    expect(body.data.messages.length).toBeGreaterThanOrEqual(2);
  });

  it("retorna null para rota desconhecida", () => {
    expect(resolveDemoApiResponse(req("/api/unknown-route"))).toBeNull();
  });
});
