import { describe, expect, it, afterEach } from "vitest";
import { isShowcaseDemoMode } from "../demoMode";

describe("isShowcaseDemoMode", () => {
  const prev = process.env.NEXT_PUBLIC_DEMO_MODE;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
    else process.env.NEXT_PUBLIC_DEMO_MODE = prev;
  });

  it("é false por defeito", () => {
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    expect(isShowcaseDemoMode()).toBe(false);
  });

  it("é true quando NEXT_PUBLIC_DEMO_MODE=true", () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    expect(isShowcaseDemoMode()).toBe(true);
  });
});
