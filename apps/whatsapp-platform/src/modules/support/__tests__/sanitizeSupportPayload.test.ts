import { describe, it, expect } from "vitest";
import { sanitizeSupportPayload } from "../sanitizeSupportPayload";

describe("sanitizeSupportPayload", () => {
  it("remove chaves com nomes sensíveis", () => {
    const input = {
      ok: true,
      accessToken: "secret",
      nested: { api_key: "x", safe: 1 },
    };
    const out = sanitizeSupportPayload(input) as Record<string, unknown>;
    expect(out.accessToken).toBeUndefined();
    expect((out.nested as Record<string, unknown>).api_key).toBeUndefined();
    expect((out.nested as Record<string, unknown>).safe).toBe(1);
  });

  it("ofusca padrões em strings", () => {
    const s = sanitizeSupportPayload({
      msg: "token sk_live_abcdefghijklmnopqrstuvwxyz012345 end",
    }) as { msg: string };
    expect(s.msg).toContain("[redacted]");
    expect(s.msg).not.toContain("sk_live_");
  });
});
