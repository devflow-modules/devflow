import { describe, expect, it } from "vitest";
import { parseMetaApiError } from "../whatsappMessaging.errors";

describe("parseMetaApiError", () => {
  it("mapeia 403 para META_PERMISSION_DENIED", () => {
    const p = parseMetaApiError(
      403,
      JSON.stringify({ error: { message: "denied", code: 10, fbtrace_id: "abc" } })
    );
    expect(p.code).toBe("META_PERMISSION_DENIED");
    expect(p.fbtraceId).toBe("abc");
  });

  it("aceita body não-JSON", () => {
    const p = parseMetaApiError(500, "plain");
    expect(p.message).toBeTruthy();
  });
});
