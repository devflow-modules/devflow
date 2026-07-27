import type { Page, Route } from "@playwright/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyNextImageRequest,
  createDefaultInboxMockStore,
  finalizeInboxIsolationEvidence,
  getInboxIsolationEvidence,
  installInboxOperationalMocks,
  resetInboxIsolationEvidenceForTests,
} from "./inbox-api-mock";

type Handler = (route: Route) => Promise<unknown>;
type WebSocketHandler = (socket: {
  url(): string;
  close(options: { code: number; reason: string }): Promise<void>;
}) => Promise<void> | void;
type InstalledHandler = Handler & { websocketHandler: WebSocketHandler };

async function installedHandler(
  baseUrl = "http://127.0.0.1:3099"
): Promise<InstalledHandler> {
  let handler: Handler | undefined;
  let websocketHandler: WebSocketHandler | undefined;
  const page = {
    route: vi.fn(async (_pattern: string, value: Handler) => {
      handler = value;
    }),
    routeWebSocket: vi.fn(async (_pattern: string, value: WebSocketHandler) => {
      websocketHandler = value;
    }),
  };
  await installInboxOperationalMocks(
    page as unknown as Page,
    createDefaultInboxMockStore(),
    baseUrl
  );
  expect(page.route).toHaveBeenCalledWith("**/*", expect.any(Function));
  expect(page.routeWebSocket).toHaveBeenCalledWith("**/*", expect.any(Function));
  return Object.assign(handler!, { websocketHandler: websocketHandler! });
}

async function dispatch(
  handler: Handler,
  url: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const calls: Array<{ kind: string; value?: unknown }> = [];
  const route = {
    request: () => ({
      url: () => url,
      method: () => method,
      postData: () => (body === undefined ? null : JSON.stringify(body)),
      headers: () => headers,
    }),
    fulfill: async (value: unknown) => calls.push({ kind: "fulfill", value }),
    continue: async () => calls.push({ kind: "continue" }),
    abort: async (value: unknown) => calls.push({ kind: "abort", value }),
  };
  await handler(route as unknown as Route);
  return calls;
}

describe("inbox API fail-closed mock", () => {
  beforeEach(() => {
    resetInboxIsolationEvidenceForTests();
  });

  it("reports every isolation category with explicit zero observations", async () => {
    await installedHandler();
    finalizeInboxIsolationEvidence();
    const evidence = getInboxIsolationEvidence();
    expect(evidence.complete).toBe(true);
    expect(evidence.externalRealRequests).toBe(0);
    expect(Object.values(evidence.categories)).toHaveLength(11);
    for (const counter of Object.values(evidence.categories)) {
      expect(counter).toEqual({
        observed: 0,
        blocked: 0,
        allowed: 0,
        realNetworkReached: 0,
      });
    }
  });

  it("aggregates allowed, blocked and real-network decisions without sensitive data", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = await installedHandler();
    await dispatch(handler, "http://127.0.0.1:3099/api/auth/login", "POST");
    await dispatch(handler, "http://127.0.0.1:3099/api/auth/verify");
    await dispatch(handler, "http://127.0.0.1:3099/api/realtime/stream");
    await dispatch(handler, "http://127.0.0.1:3099/_next/image?token=private");
    await dispatch(handler, "http://127.0.0.1:3099/__nextjs_launch-editor?file=private.ts");
    await dispatch(handler, "http://127.0.0.1:3099/api/unknown?secret=private");
    await dispatch(
      handler,
      "http://127.0.0.1:3099/action?secret=private",
      "POST",
      undefined,
      { "next-action": "private-action-id" }
    );
    await dispatch(handler, "http://127.0.0.1:3099/inbox", "POST");
    await dispatch(handler, "http://127.0.0.1:3100/api/auth/verify");
    await dispatch(handler, "https://external.example.test/private?token=private");
    await handler.websocketHandler({
      url: () => "wss://external.example.test/private?token=private",
      close: async () => undefined,
    });
    finalizeInboxIsolationEvidence();

    const evidence = getInboxIsolationEvidence();
    expect(evidence.categories.authorizedBackendLogin).toEqual({
      observed: 1,
      blocked: 0,
      allowed: 1,
      realNetworkReached: 1,
    });
    expect(evidence.categories.blockedNextImage.blocked).toBe(1);
    expect(evidence.categories.blockedNextDevelopment.blocked).toBe(1);
    expect(evidence.categories.blockedUnknownLocalApi.blocked).toBe(1);
    expect(evidence.categories.blockedServerAction.blocked).toBe(1);
    expect(evidence.categories.blockedUnauthorizedLocalMutation.blocked).toBe(1);
    expect(evidence.categories.blockedOtherOriginPort).toMatchObject({
      observed: 2,
      blocked: 2,
      allowed: 0,
      realNetworkReached: 0,
    });
    expect(evidence.externalRealRequests).toBe(0);
    expect(evidence.categories.externalRealRequests).toMatchObject({
      observed: 0,
      blocked: 0,
      allowed: 0,
      realNetworkReached: 0,
    });
    expect(evidence.categories.blockedWebSocket.blocked).toBe(1);
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toMatch(/private|token|secret|example\.test|action-id/);
    expect(error.mock.calls.flat().join(" ")).not.toMatch(/token=|secret=|private-action-id/);
  });

  it("returns deterministic billing UI data", async () => {
    const handler = await installedHandler();
    const first = await dispatch(handler, "http://127.0.0.1:3099/api/billing/ui");
    const second = await dispatch(handler, "http://127.0.0.1:3099/api/billing/ui");
    expect(first).toEqual(second);
    expect(first[0]?.kind).toBe("fulfill");
    expect(JSON.parse((first[0]?.value as { body: string }).body)).toMatchObject({
      success: true,
      data: { plan: "FREE", status: "ACTIVE" },
    });
  });

  it("allows only known local auth and realtime passthrough", async () => {
    const handler = await installedHandler();
    await expect(
      dispatch(handler, "http://127.0.0.1:3099/api/auth/login", "POST")
    ).resolves.toEqual([{ kind: "continue" }]);
    await expect(
      dispatch(handler, "http://127.0.0.1:3099/api/auth/verify")
    ).resolves.toEqual([{ kind: "continue" }]);
    await expect(
      dispatch(handler, "http://127.0.0.1:3099/api/realtime/stream")
    ).resolves.toEqual([{ kind: "continue" }]);
  });

  it("allows only known documents and required Next assets", async () => {
    const handler = await installedHandler();
    for (const pathname of [
      "/login?next=%2Finbox",
      "/inbox?filter=open",
      "/_next/static/chunks/app/inbox.js",
      "/_next/static/css/app.css",
      "/_next/data/build/inbox.json",
      "/_next/webpack-hmr",
      "/favicon.ico",
    ]) {
      await expect(
        dispatch(handler, `http://127.0.0.1:3099${pathname}`)
      ).resolves.toEqual([{ kind: "continue" }]);
    }
  });

  it("blocks Next development endpoints with local side effects", async () => {
    const handler = await installedHandler();
    for (const pathname of [
      "/__nextjs_attach-nodejs-inspector",
      "/__nextjs_launch-editor?file=private-source.ts&lineNumber=1&column=1",
      "/__nextjs_original-stack-frames?source=private-source.ts",
    ]) {
      const calls = await dispatch(handler, `http://127.0.0.1:3099${pathname}`);
      expect(calls).toEqual([{ kind: "abort", value: "blockedbyclient" }]);
      expect(calls.some((call) => call.kind === "continue")).toBe(false);
    }
  });

  it("classifies the Image Optimizer as disabled for this image-free E2E app", () => {
    expect(classifyNextImageRequest("/_next/image")).toBe(
      "blocked-image-optimizer-disabled"
    );
    expect(classifyNextImageRequest("/_next/static/logo.png")).toBe(
      "not-image-optimizer"
    );
  });

  it("blocks every Image Optimizer target before Next can proxy it", async () => {
    const handler = await installedHandler();
    const rejectedRequests: Array<[string, string]> = [
      ["/_next/image?url=/logo.png&w=64&q=75", "GET"],
      ["/_next/image?url=/api/billing/ui&w=640&q=75", "GET"],
      ["/_next/image?url=/api%2Fbilling%2Fui&w=640&q=75", "GET"],
      ["/_next/image?url=%2Fapi%2Fbilling%2Fui&w=640&q=75", "GET"],
      ["/_next/image?url=%252Fapi%252Fbilling%252Fui&w=640&q=75", "GET"],
      [
        "/_next/image?url=http%3A%2F%2F127.0.0.1%3A3099%2Fapi%2Fbilling%2Fui",
        "GET",
      ],
      ["/_next/image?url=https%3A%2F%2Fexternal.example.test%2Fimage.png", "GET"],
      ["/_next/image?url=%2F%2Fexternal.example.test%2Fimage.png", "GET"],
      [
        "/_next/image?url=http%3A%2F%2F127.0.0.1%3A3100%2Fstatic%2Fimage.png",
        "GET",
      ],
      ["/_next/image?url=ftp%3A%2F%2Fexternal.example.test%2Fimage.png", "GET"],
      [
        "/_next/image?url=http%3A%2F%2Fuser%3Apassword%40127.0.0.1%3A3099%2Fimage.png",
        "GET",
      ],
      ["/_next/image?url=%5Capi%5Cbilling%5Cui", "GET"],
      ["/_next/image?url=%2Fimages%2F..%2Fapi%2Fbilling%2Fui", "GET"],
      ["/_next/image?url=%2Fimage.png%23fragment", "GET"],
      ["/_next/image?url=%E0%A4%A", "GET"],
      ["/_next/image?w=640&q=75", "GET"],
      ["/_next/image?url=/one.png&url=/two.png", "GET"],
      ["/_next/image?url=/logo.png", "HEAD"],
      ["/_next/image?url=/logo.png", "POST"],
    ];

    for (const [pathname, method] of rejectedRequests) {
      const calls = await dispatch(handler, `http://127.0.0.1:3099${pathname}`, method);
      expect(calls, `${method} ${pathname}`).toEqual([
        { kind: "abort", value: "blockedbyclient" },
      ]);
      expect(calls.some((call) => call.kind === "continue")).toBe(false);
    }
  });

  it("does not expose Image Optimizer targets in blocked diagnostics", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = await installedHandler();
    await dispatch(
      handler,
      "http://127.0.0.1:3099/_next/image?url=/api/billing/ui&token=query-secret"
    );
    expect(error).toHaveBeenLastCalledWith(
      "[inbox-e2e] blocked request: GET category=image-optimizer-disabled"
    );
    expect(error.mock.calls.flat().join(" ")).not.toMatch(
      /billing|query-secret|token/
    );
  });

  it("blocks unknown same-origin documents and every unknown mutation", async () => {
    const handler = await installedHandler();
    await expect(
      dispatch(handler, "http://127.0.0.1:3099/dashboard")
    ).resolves.toEqual([{ kind: "abort", value: "blockedbyclient" }]);
    for (const [pathname, method] of [
      ["/inbox", "POST"],
      ["/login", "PUT"],
      ["/_next/static/chunks/app/inbox.js", "DELETE"],
      ["/possible-server-action", "POST"],
      ["/api/auth/verify", "POST"],
    ]) {
      await expect(
        dispatch(handler, `http://127.0.0.1:3099${pathname}`, method)
      ).resolves.toEqual([{ kind: "abort", value: "blockedbyclient" }]);
    }
  });

  it("blocks other local ports, hosts and schemes", async () => {
    const handler = await installedHandler();
    for (const url of [
      "http://127.0.0.1:3100/api/auth/verify",
      "http://localhost:3099/api/auth/verify",
      "https://127.0.0.1:3099/api/auth/verify",
    ]) {
      await expect(dispatch(handler, url)).resolves.toEqual([
        { kind: "abort", value: "blockedbyclient" },
      ]);
    }
  });

  it("rejects a configured non-local base URL", async () => {
    await expect(installedHandler("https://example.test")).rejects.toThrow(/local base URL/);
  });

  it("aborts an unknown local API with no backend call", async () => {
    const handler = await installedHandler();
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      const calls = await dispatch(
        handler,
        "http://127.0.0.1:3099/api/unknown?secret=query",
        method,
        { secret: "body" }
      );
      expect(calls).toEqual([{ kind: "abort", value: "blockedbyclient" }]);
    }
  });

  it("logs blocked diagnostics with method and sanitized category only", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = await installedHandler();
    await dispatch(
      handler,
      "http://127.0.0.1:3099/api/unknown?token=query-secret",
      "POST",
      { password: "body-secret" }
    );
    expect(error).toHaveBeenLastCalledWith(
      "[inbox-e2e] blocked request: POST category=unknown-local-api"
    );
    expect(error.mock.calls.flat().join(" ")).not.toMatch(/query-secret|body-secret|token|password/);
  });

  it("blocks every external browser origin", async () => {
    const handler = await installedHandler();
    for (const url of [
      "https://graph.facebook.com/v22.0/messages",
      "https://api.stripe.com/v1/customers",
      "https://api.openai.com/v1/responses",
      "https://api.resend.com/emails",
    ]) {
      await expect(dispatch(handler, url, "POST")).resolves.toEqual([
        { kind: "abort", value: "blockedbyclient" },
      ]);
    }
  });

  it("blocks WebSocket connections without connecting to a server", async () => {
    const handler = await installedHandler();
    const close = vi.fn(async () => undefined);
    await handler.websocketHandler({
      url: () => "wss://external.example.test/socket",
      close,
    });
    expect(close).toHaveBeenCalledWith({
      code: 1008,
      reason: "Inbox E2E network allowlist",
    });
  });

  it("mocks Meta send locally and blocks dangerous operational APIs", async () => {
    const handler = await installedHandler();
    const send = await dispatch(
      handler,
      "http://127.0.0.1:3099/api/inbox/conversations/e2e-wa-inbox-thread-a/send",
      "POST",
      { text: "safe" }
    );
    expect(send[0]?.kind).toBe("fulfill");

    for (const pathname of [
      "/api/stripe/webhook",
      "/api/webhooks/meta",
      "/api/ai/generate",
      "/api/email/send",
      "/api/workers/run",
    ]) {
      await expect(
        dispatch(handler, `http://127.0.0.1:3099${pathname}`, "POST")
      ).resolves.toEqual([{ kind: "abort", value: "blockedbyclient" }]);
    }
  });

  it("never continues operational requests to the real backend", async () => {
    const handler = await installedHandler();
    const requests: Array<[string, string, unknown?]> = [
      ["/api/billing/ui", "GET"],
      ["/api/whatsapp/phone-numbers", "GET"],
      ["/api/queues", "GET"],
      ["/api/inbox/metrics", "GET"],
      ["/api/inbox/team", "GET"],
      ["/api/inbox/tags", "GET"],
      ["/api/inbox/users", "GET"],
      ["/api/inbox/presence", "GET"],
      ["/api/inbox/queue/next", "GET"],
      ["/api/metrics/revenue", "GET"],
      ["/api/inbox/prospect-metrics", "GET"],
      ["/api/inbox/conversations", "GET"],
      ["/api/inbox/conversations/e2e-wa-inbox-thread-a/messages", "GET"],
      [
        "/api/inbox/conversations/e2e-wa-inbox-thread-a/send",
        "POST",
        { text: "safe" },
      ],
      ["/api/stripe/webhook", "POST"],
      ["/api/webhooks/meta", "POST"],
    ];
    for (const [pathname, method, body] of requests) {
      const calls = await dispatch(
        handler,
        `http://127.0.0.1:3099${pathname}`,
        method,
        body
      );
      expect(calls.some((call) => call.kind === "continue"), `${method} ${pathname}`).toBe(false);
      expect(calls).toHaveLength(1);
    }
  });
});
