import { describe, expect, it } from "vitest";
import {
  isManager,
  isOperator,
  isPathRestrictedForOperator,
  isPlatformAdmin,
  isTenantManager,
  shellHomeHref,
} from "../roles";

describe("roles", () => {
  it("isOperator / isManager / isPlatformAdmin / isTenantManager", () => {
    expect(isOperator("operator")).toBe(true);
    expect(isOperator("manager")).toBe(false);
    expect(isManager("manager")).toBe(true);
    expect(isPlatformAdmin("platform_admin")).toBe(true);
    expect(isTenantManager("manager")).toBe(true);
    expect(isTenantManager("platform_admin")).toBe(true);
    expect(isTenantManager("operator")).toBe(false);
    expect(isOperator(undefined)).toBe(false);
  });

  it("isPathRestrictedForOperator", () => {
    expect(isPathRestrictedForOperator("/settings")).toBe(true);
    expect(isPathRestrictedForOperator("/settings/ai")).toBe(true);
    expect(isPathRestrictedForOperator("/billing")).toBe(true);
    expect(isPathRestrictedForOperator("/dashboard")).toBe(true);
    expect(isPathRestrictedForOperator("/dashboard/whatsapp")).toBe(true);
    expect(isPathRestrictedForOperator("/onboarding")).toBe(true);
    expect(isPathRestrictedForOperator("/inbox")).toBe(false);
    expect(isPathRestrictedForOperator("/automation")).toBe(false);
  });

  it("shellHomeHref — operador na Inbox; gestores no painel IA", () => {
    expect(shellHomeHref("operator")).toBe("/inbox");
    expect(shellHomeHref("manager")).toBe("/dashboard/ai");
    expect(shellHomeHref("platform_admin")).toBe("/dashboard/ai");
    expect(shellHomeHref(null)).toBe("/dashboard/ai");
    expect(shellHomeHref(undefined)).toBe("/dashboard/ai");
  });
});
