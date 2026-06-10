import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

describe("proxy", () => {
  it("exports proxy handler and matcher config", () => {
    expect(typeof proxy).toBe("function");
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher.length).toBeGreaterThan(0);
  });
});
