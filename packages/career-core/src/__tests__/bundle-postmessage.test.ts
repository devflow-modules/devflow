import { describe, expect, it } from "vitest";
import { createCareerBundle } from "../bundle-helpers.js";
import {
  buildAllowedApplyflowOriginsList,
  createCareerBundleHandshakeAck,
  createCareerBundleHandshakeMessage,
  DEVFLOW_CAREER_BUNDLE_MESSAGE_TYPE,
  isAllowedApplyflowPostMessageOrigin,
  normalizeWebOrigin,
  parseHandshakeCareerBundleAck,
  parseHandshakeCareerBundleMessage,
} from "../bundle-postmessage.js";

describe("normalizeWebOrigin", () => {
  it("returns origin for absolute http URL", () => {
    expect(normalizeWebOrigin("http://localhost:3010/dashboard")).toBe("http://localhost:3010");
  });
});

describe("buildAllowedApplyflowOriginsList", () => {
  it("returns localhost defaults when unset", () => {
    expect(buildAllowedApplyflowOriginsList(null)).toEqual(["http://localhost:3010", "http://127.0.0.1:3010"]);
  });

  it("returns only configured origin when set", () => {
    expect(buildAllowedApplyflowOriginsList("https://apply.example.com")).toEqual(["https://apply.example.com"]);
  });
});

describe("isAllowedApplyflowPostMessageOrigin", () => {
  it("rejects unknown origin when configured", () => {
    expect(isAllowedApplyflowPostMessageOrigin("https://evil.com", "https://apply.example.com")).toBe(false);
  });

  it("accepts localhost when unconfigured", () => {
    expect(isAllowedApplyflowPostMessageOrigin("http://localhost:3010", null)).toBe(true);
  });
});

describe("parseHandshakeCareerBundleMessage", () => {
  it("rejects wrong type", () => {
    const r = parseHandshakeCareerBundleMessage({ type: "other", source: "applyflow", payload: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("shape");
  });

  it("rejects invalid bundle payload", () => {
    const r = parseHandshakeCareerBundleMessage({
      type: DEVFLOW_CAREER_BUNDLE_MESSAGE_TYPE,
      source: "applyflow",
      payload: {},
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("bundle");
  });

  it("accepts valid bundle", () => {
    const bundle = createCareerBundle([]);
    const msg = createCareerBundleHandshakeMessage(bundle);
    const r = parseHandshakeCareerBundleMessage(msg);
    expect(r.ok).toBe(true);
  });
});

describe("parseHandshakeCareerBundleAck", () => {
  it("parses valid ack", () => {
    const r = parseHandshakeCareerBundleAck(createCareerBundleHandshakeAck(true));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ack.ok).toBe(true);
  });

  it("rejects non-ack", () => {
    expect(parseHandshakeCareerBundleAck({ foo: 1 }).ok).toBe(false);
  });
});
