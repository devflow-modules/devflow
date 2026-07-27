import type { Page, Route } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";
import { createDefaultInboxMockStore, installInboxOperationalMocks } from "./inbox-api-mock";

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

async function dispatch(handler: Handler, url: string, method = "GET", body?: unknown) {
  const calls: Array<{ kind: string; value?: unknown }> = [];
  const route = {
    request: () => ({
      url: () => url,
      method: () => method,
      postData: () => (body === undefined ? null : JSON.stringify(body)),
    }),
    fulfill: async (value: unknown) => calls.push({ kind: "fulfill", value }),
    continue: async () => calls.push({ kind: "continue" }),
    abort: async (value: unknown) => calls.push({ kind: "abort", value }),
  };
  await handler(route as unknown as Route);
  return calls;
}

describe("inbox API fail-closed mock", () => {
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
    const calls = await dispatch(handler, "http://127.0.0.1:3099/api/unknown");
    expect(calls).toEqual([{ kind: "abort", value: "blockedbyclient" }]);
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
});
