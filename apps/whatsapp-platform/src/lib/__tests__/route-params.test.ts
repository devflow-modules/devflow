import { describe, expect, it } from "vitest";
import { parseCuidParam } from "../route-params";

describe("parseCuidParam", () => {
  it("aceita cuid válido", () => {
    const id = "clq5yq0n000008xl8k3g2h8r9";
    expect(parseCuidParam(id)).toBe(id);
  });

  it("rejeita string arbitrária", () => {
    expect(parseCuidParam("not-a-cuid")).toBeNull();
    expect(parseCuidParam("")).toBeNull();
  });
});
