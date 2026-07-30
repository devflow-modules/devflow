import { describe, expect, it } from "vitest";
import {
  isManager,
  isOperator,
  isPathRestrictedForOperator,
  isPlatformAdmin,
  isTenantManager,
  shellHomeHref,
  showDistribuirInShellNav,
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

  it("shellHomeHref — operador na Inbox; gestores no painel; null fail-closed na Inbox", () => {
    expect(shellHomeHref("operator")).toBe("/inbox");
    expect(shellHomeHref("manager")).toBe("/dashboard");
    expect(shellHomeHref("platform_admin")).toBe("/dashboard");
    expect(shellHomeHref(null)).toBe("/inbox");
    expect(shellHomeHref(undefined)).toBe("/inbox");
  });

  it("showDistribuirInShellNav — operator e manager; fail-closed para platform_admin e null", () => {
    expect(showDistribuirInShellNav("operator")).toBe(true);
    expect(showDistribuirInShellNav("manager")).toBe(true);
    expect(showDistribuirInShellNav("platform_admin")).toBe(false);
    expect(showDistribuirInShellNav(null)).toBe(false);
    expect(showDistribuirInShellNav(undefined)).toBe(false);
  });
});
