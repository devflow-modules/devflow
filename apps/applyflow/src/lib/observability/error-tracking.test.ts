import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  captureApplyFlowException,
  getLastApplyFlowErrorTransportOutcomeForTests,
  getLastCapturedApplyFlowErrorForTests,
  isApplyFlowErrorTrackingEnabled,
  isApplyFlowErrorTrackingTransportReady,
  resetApplyFlowErrorTrackingForTests,
  resolveApplyFlowErrorTrackingDsn,
  setApplyFlowErrorTrackingSinkForTests,
} from "./error-tracking";
import {
  parseSentryDsn,
  sendSanitizedApplyFlowEventToSentry,
  setApplyFlowSentryFetchForTests,
} from "./sentry-transport";

const SAMPLE_DSN = "https://publickey1234567890abcdef@o123456.ingest.sentry.io/987654";

describe("ApplyFlow error tracking", () => {
  beforeEach(() => {
    resetApplyFlowErrorTrackingForTests();
    setApplyFlowSentryFetchForTests(null);
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    resetApplyFlowErrorTrackingForTests();
    setApplyFlowSentryFetchForTests(null);
    vi.unstubAllEnvs();
  });

  it("does not crash without DSN and does not network", async () => {
    expect(isApplyFlowErrorTrackingEnabled({})).toBe(false);
    expect(isApplyFlowErrorTrackingTransportReady({})).toBe(false);
    const fetchMock = vi.fn();
    setApplyFlowSentryFetchForTests(fetchMock);
    expect(() => captureApplyFlowException(new Error("boom"), { area: "server" })).not.toThrow();
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getLastApplyFlowErrorTransportOutcomeForTests()).toBe("noop");
  });

  it("captures unexpected errors via sink", () => {
    const events: unknown[] = [];
    setApplyFlowErrorTrackingSinkForTests((event) => events.push(event));
    captureApplyFlowException(new Error("unexpected failure"), {
      area: "client",
      route: "/dashboard",
    });
    expect(events).toHaveLength(1);
    expect(getLastCapturedApplyFlowErrorForTests()?.message).toContain("unexpected");
  });

  it("ignores expected product 4xx", () => {
    const events: unknown[] = [];
    setApplyFlowErrorTrackingSinkForTests((event) => events.push(event));
    captureApplyFlowException(new Error("auth"), { area: "api", statusCode: 401 });
    captureApplyFlowException(new Error("limit"), { area: "api", statusCode: 429 });
    captureApplyFlowException(new Error("missing"), { area: "api", statusCode: 404 });
    expect(events).toHaveLength(0);
    expect(getLastApplyFlowErrorTransportOutcomeForTests()).toBe("skipped");
  });

  it("redacts sensitive message fragments", () => {
    setApplyFlowErrorTrackingSinkForTests(() => undefined);
    captureApplyFlowException(new Error("Authorization Bearer abc and resume dump"), {
      area: "server",
    });
    expect(getLastCapturedApplyFlowErrorForTests()?.message).toBe("redacted_error_message");
  });

  it("redacts CV / notes / cookie / DB / DSN fragments and ignores expected 422", () => {
    const events: unknown[] = [];
    setApplyFlowErrorTrackingSinkForTests((event) => events.push(event));
    captureApplyFlowException(new Error("candidate CV text leaked"), { area: "server" });
    expect(getLastCapturedApplyFlowErrorForTests()?.message).toBe("redacted_error_message");
    captureApplyFlowException(new Error("validation"), { area: "api", statusCode: 422 });
    captureApplyFlowException(new Error("cookie header dump"), { area: "server" });
    captureApplyFlowException(new Error("DATABASE_URL postgres://x"), { area: "server" });
    captureApplyFlowException(new Error("DIRECT_URL leak"), { area: "server" });
    captureApplyFlowException(new Error("sentry_dsn https://x"), { area: "server" });
    captureApplyFlowException(new Error("job description body"), { area: "server" });
    expect(events.filter((e) => (e as { message: string }).message !== "redacted_error_message")).toHaveLength(
      0,
    );
  });

  it("attaches release and environment metadata when provided", () => {
    setApplyFlowErrorTrackingSinkForTests(() => undefined);
    captureApplyFlowException(new Error("boom"), {
      area: "server",
      release: "abc123def456",
      environment: "preview",
    });
    const captured = getLastCapturedApplyFlowErrorForTests();
    expect(captured?.context.release).toBe("abc123def456");
    expect(captured?.context.environment).toBe("preview");
  });

  it("derives release and environment from Vercel metadata", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "a310fabedeadbeef00112233");
    vi.stubEnv("VERCEL_ENV", "production");
    setApplyFlowErrorTrackingSinkForTests(() => undefined);
    captureApplyFlowException(new Error("boom"), { area: "server" });
    const captured = getLastCapturedApplyFlowErrorForTests();
    expect(captured?.context.release).toBe("a310fabedead");
    expect(captured?.context.environment).toBe("production");
  });

  it("resolves DSN from APPLYFLOW_SENTRY_DSN then public then SENTRY_DSN", () => {
    expect(resolveApplyFlowErrorTrackingDsn({ SENTRY_DSN: "https://a@b/1" })).toContain("https://");
    expect(
      resolveApplyFlowErrorTrackingDsn({
        APPLYFLOW_SENTRY_DSN: "https://primary@o1.ingest.sentry.io/1",
        SENTRY_DSN: "https://fallback@o1.ingest.sentry.io/2",
      }),
    ).toContain("primary");
    expect(
      resolveApplyFlowErrorTrackingDsn({
        NEXT_PUBLIC_APPLYFLOW_SENTRY_DSN: "https://pub@o1.ingest.sentry.io/3",
      }),
    ).toContain("pub");
  });

  it("calls Sentry transport for unexpected errors when DSN is set", async () => {
    vi.stubEnv("APPLYFLOW_SENTRY_DSN", SAMPLE_DSN);
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    setApplyFlowSentryFetchForTests(fetchMock);

    captureApplyFlowException(new Error("invariant failed"), {
      area: "api",
      route: "/api/applyflow/job-sources/search",
      statusCode: 500,
      errorCode: "provider_unavailable",
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("ingest.sentry.io/api/987654/envelope/");
    expect(String(url)).toContain("sentry_key=");
    const body = String(init?.body ?? "");
    expect(body).toContain("invariant failed");
    expect(body).toContain('"applyflow_area":"api"');
    expect(body).not.toMatch(/Bearer\s+/i);
    expect(body).not.toContain("DATABASE_URL=");
    expect(body).toContain("applyflow.minimal");
    expect(getLastApplyFlowErrorTransportOutcomeForTests()).toBe("sent");
  });

  it("does not crash the request when transport fails", async () => {
    vi.stubEnv("APPLYFLOW_SENTRY_DSN", SAMPLE_DSN);
    setApplyFlowSentryFetchForTests(async () => {
      throw new Error("network down");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      captureApplyFlowException(new Error("boom"), { area: "server", statusCode: 500 }),
    ).not.toThrow();

    await vi.waitFor(() => {
      expect(getLastApplyFlowErrorTransportOutcomeForTests()).toBe("failed");
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("Sentry transport", () => {
  afterEach(() => {
    setApplyFlowSentryFetchForTests(null);
  });

  it("parses valid DSN and rejects garbage", () => {
    expect(parseSentryDsn(SAMPLE_DSN)).toMatchObject({
      publicKey: "publickey1234567890abcdef",
      projectId: "987654",
      host: "o123456.ingest.sentry.io",
    });
    expect(parseSentryDsn("not-a-dsn")).toBeNull();
    expect(parseSentryDsn("https://nokey@host/")).toBeNull();
  });

  it("send refuses invalid DSN without calling fetch", async () => {
    const fetchMock = vi.fn();
    setApplyFlowSentryFetchForTests(fetchMock);
    const result = await sendSanitizedApplyFlowEventToSentry(
      {
        name: "Error",
        message: "x",
        level: "error",
        context: { environment: "test" },
      },
      "bad",
    );
    expect(result).toEqual({ ok: false, reason: "invalid_dsn" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("send returns http failure without throwing", async () => {
    setApplyFlowSentryFetchForTests(async () => ({ ok: false, status: 429 }));
    const result = await sendSanitizedApplyFlowEventToSentry(
      {
        name: "Error",
        message: "safe",
        level: "error",
        context: { environment: "test", release: "a310fabe" },
      },
      SAMPLE_DSN,
    );
    expect(result).toEqual({ ok: false, reason: "http", status: 429 });
  });
});
