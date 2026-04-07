import { describe, expect, it } from "vitest";
import {
  redactUrl,
  sanitizeEmailPayloadForMetadata,
  sanitizeTransactionalEmailLog,
} from "../utils/sanitizeEmailLogData";

describe("redactUrl", () => {
  it("mascara query com token", () => {
    expect(redactUrl("https://app.example/reset?token=abc123")).toBe(
      "https://app.example/reset?[REDACTED_QUERY]"
    );
  });

  it("mantém query não sensível", () => {
    expect(redactUrl("https://app.example/login?next=%2Fdashboard")).toBe(
      "https://app.example/login?next=%2Fdashboard"
    );
  });
});

describe("sanitizeEmailPayloadForMetadata", () => {
  it("não mantém senha temporária em claro", () => {
    const out = sanitizeEmailPayloadForMetadata({
      temporaryPassword: "secret-pass",
      loginUrl: "https://x.com/login",
    });
    expect(out.temporaryPassword).toBe("[REDACTED_PASSWORD]");
    expect(out.loginUrl).toBe("https://x.com/login");
  });
});

describe("sanitizeTransactionalEmailLog", () => {
  it("inclui metadata sanitizada", () => {
    const log = sanitizeTransactionalEmailLog({
      type: "RESET_PASSWORD",
      tenantId: "t",
      userId: "u",
      toEmail: "a@b.com",
      status: "SENT",
      durationMs: 12,
      provider: "resend",
      providerMessageId: "mid",
      metadataHint: { resetUrl: "https://x/r?token=zzz" },
    });
    expect(log.metadata).toEqual({ resetUrl: "https://x/r?[REDACTED_QUERY]" });
  });
});
