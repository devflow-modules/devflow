import { describe, expect, it } from "vitest";
import {
  buildEmbeddedSignupWabaFailureDiagnosis,
  buildEmbeddedSignupWabaRequestLog,
  classifyEmbeddedSignupWabaFailure,
  maskEmbeddedSignupConfigId,
  tryParseMetaGraphError,
} from "../embeddedSignupDiagnostics";

describe("embeddedSignupDiagnostics", () => {
  it("mascara config_id sem expor o valor completo", () => {
    expect(maskEmbeddedSignupConfigId("12345678901234567890")).toMatch(/^1234…7890$/);
    expect(maskEmbeddedSignupConfigId("short")).toBe("***");
  });

  it("extrai code, error_subcode e fbtrace_id do JSON da Meta", () => {
    const raw = JSON.stringify({
      error: {
        message: "Application does not have permission for this action",
        type: "OAuthException",
        code: 10,
        error_subcode: 1752203,
        fbtrace_id: "AbCdEf",
      },
    });
    const p = tryParseMetaGraphError(raw);
    expect(p?.code).toBe(10);
    expect(p?.error_subcode).toBe(1752203);
    expect(p?.fbtrace_id).toBe("AbCdEf");
    expect(p?.message).toContain("permission");
  });

  it("classifica code 10 como permissão", () => {
    const p = tryParseMetaGraphError(
      JSON.stringify({
        error: { message: "x", code: 10, error_subcode: 1752203 },
      })
    );
    expect(classifyEmbeddedSignupWabaFailure(p, 400)).toBe("graph_permission_denied");
  });

  it("buildEmbeddedSignupWabaFailureDiagnosis distingue camada provável para code 10", () => {
    const parsed = tryParseMetaGraphError(
      JSON.stringify({
        error: {
          message: "Application does not have permission for this action",
          code: 10,
          error_subcode: 1752203,
        },
      })
    );
    const d = buildEmbeddedSignupWabaFailureDiagnosis({
      cause: "graph_permission_denied",
      parsed,
    });
    expect(d.likelyLayer).toBe("app_or_integration");
    expect(d.summary).toContain("1752203");
  });

  it("buildEmbeddedSignupWabaRequestLog inclui edge e fields sem secrets", () => {
    const log = buildEmbeddedSignupWabaRequestLog({
      graphApiBase: "https://graph.facebook.com/v21.0",
      embeddedSignupConfigId: "cfg_12345678901234567890",
      appId: "1234567890",
    });
    expect(log.edge).toBe("assigned_whatsapp_business_accounts");
    expect(log.graphPath).toContain("assigned_whatsapp");
    expect(log.embeddedSignupConfigIdMasked).toContain("…");
    expect(log.appId).toBe("1234567890");
  });
});
