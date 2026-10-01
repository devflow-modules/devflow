import { describe, expect, it, beforeEach } from "vitest";

import {
  captureApplyFlowException,
  getLastCapturedApplyFlowErrorForTests,
  isApplyFlowErrorTrackingEnabled,
  resetApplyFlowErrorTrackingForTests,
  setApplyFlowErrorTrackingSinkForTests,
} from "./error-tracking";

describe("ApplyFlow error tracking", () => {
  beforeEach(() => {
    resetApplyFlowErrorTrackingForTests();
  });

  it("does not crash without DSN", () => {
    expect(isApplyFlowErrorTrackingEnabled({})).toBe(false);
    expect(() => captureApplyFlowException(new Error("boom"), { area: "server" })).not.toThrow();
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
    expect(events).toHaveLength(0);
  });

  it("redacts sensitive message fragments", () => {
    setApplyFlowErrorTrackingSinkForTests(() => undefined);
    captureApplyFlowException(new Error("Authorization Bearer abc and resume dump"), {
      area: "server",
    });
    expect(getLastCapturedApplyFlowErrorForTests()?.message).toBe("redacted_error_message");
  });

  it("redacts CV / notes / cookie fragments and ignores expected 422", () => {
    const events: unknown[] = [];
    setApplyFlowErrorTrackingSinkForTests((event) => events.push(event));
    captureApplyFlowException(new Error("candidate CV text leaked"), { area: "server" });
    expect(getLastCapturedApplyFlowErrorForTests()?.message).toBe("redacted_error_message");
    captureApplyFlowException(new Error("validation"), { area: "api", statusCode: 422 });
    captureApplyFlowException(new Error("cookie header dump"), { area: "server" });
    expect(events.filter((e) => (e as { message: string }).message !== "redacted_error_message")).toHaveLength(0);
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
});
