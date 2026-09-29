import { describe, it, expect } from "vitest";
import {
  MetaApiError,
  classifyMetaFetchFailure,
  classifyMetaHttpStatus,
  shouldRetryMetaFailure,
} from "@devflow/whatsapp-core";

describe("Meta retry classification", () => {
  it("429 → retry", () => {
    const c = classifyMetaHttpStatus(429, "2");
    expect(c.decision).toBe("retry");
    expect(c.kind).toBe("rate_limited");
    expect(c.retryAfterMs).toBe(2000);
  });

  it("5xx → retry", () => {
    expect(classifyMetaHttpStatus(503).decision).toBe("retry");
  });

  it("permanent 4xx → no_retry", () => {
    expect(classifyMetaHttpStatus(400).decision).toBe("no_retry");
    expect(classifyMetaHttpStatus(404).kind).toBe("permanent_http");
  });

  it("401/403 → auth_config no_retry", () => {
    expect(classifyMetaHttpStatus(401).kind).toBe("auth_config");
    expect(classifyMetaHttpStatus(403).decision).toBe("no_retry");
  });

  it("timeout → ambiguous_no_retry (do not blind-resend)", () => {
    const c = classifyMetaFetchFailure(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
    expect(c.decision).toBe("ambiguous_no_retry");
    expect(c.kind).toBe("timeout");
    expect(shouldRetryMetaFailure(c.decision)).toBe(false);
  });

  it("network TypeError → ambiguous_no_retry", () => {
    const c = classifyMetaFetchFailure(new TypeError("fetch failed"));
    expect(c.decision).toBe("ambiguous_no_retry");
  });

  it("MetaApiError decision drives shouldRetry", () => {
    const e = new MetaApiError({
      message: "x",
      kind: "rate_limited",
      decision: "retry",
      httpStatus: 429,
    });
    expect(shouldRetryMetaFailure(e.decision)).toBe(true);
  });
});
