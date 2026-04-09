import { describe, expect, it } from "vitest";
import { isAdmin, isAgent, isNavItemHiddenForAgent, isPathRestrictedForAgent } from "../roles";

describe("roles", () => {
  it("isAdmin / isAgent", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("agent")).toBe(false);
    expect(isAgent("agent")).toBe(true);
    expect(isAgent(undefined)).toBe(false);
  });

  it("isPathRestrictedForAgent", () => {
    expect(isPathRestrictedForAgent("/onboarding")).toBe(true);
    expect(isPathRestrictedForAgent("/settings/ai")).toBe(true);
    expect(isPathRestrictedForAgent("/billing")).toBe(true);
    expect(isPathRestrictedForAgent("/dashboard/whatsapp")).toBe(true);
    expect(isPathRestrictedForAgent("/inbox")).toBe(false);
    expect(isPathRestrictedForAgent("/dashboard")).toBe(false);
  });

  it("isNavItemHiddenForAgent alinha com href", () => {
    expect(isNavItemHiddenForAgent("/settings")).toBe(true);
    expect(isNavItemHiddenForAgent("/inbox")).toBe(false);
  });
});
