/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import {
  DF_NAV_SENSITIVE_DIVIDER_EXPANDED,
  DF_NAV_SENSITIVE_DIVIDER_RAIL,
  DF_NAV_SENSITIVE_IDLE,
  DF_NAV_SENSITIVE_SECTION,
  DF_NAV_SENSITIVE_SECTION_TITLE,
} from "../nav-sensitive-classes";

describe("nav-sensitive-classes (SB-7)", () => {
  const all = [
    DF_NAV_SENSITIVE_IDLE,
    DF_NAV_SENSITIVE_SECTION,
    DF_NAV_SENSITIVE_SECTION_TITLE,
    DF_NAV_SENSITIVE_DIVIDER_EXPANDED,
    DF_NAV_SENSITIVE_DIVIDER_RAIL,
  ];

  it("usa apenas tokens --df-admin-* (sem amber Tailwind)", () => {
    for (const cls of all) {
      expect(cls).toMatch(/--df-admin-/);
      expect(cls).not.toMatch(/\bamber-/);
    }
  });

  it("idle cobre texto, hover bg e hover text com tokens admin", () => {
    expect(DF_NAV_SENSITIVE_IDLE).toContain("text-[var(--df-admin-800)]");
    expect(DF_NAV_SENSITIVE_IDLE).toContain("hover:bg-[var(--df-admin-50)]");
    expect(DF_NAV_SENSITIVE_IDLE).toContain("hover:text-[var(--df-admin-900)]");
  });
});
