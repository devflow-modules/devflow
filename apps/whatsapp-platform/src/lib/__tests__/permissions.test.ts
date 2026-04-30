import { describe, expect, it } from "vitest";
import {
  canAccessBilling,
  canAccessDeveloperSettings,
  canAccessPlatformAdmin,
  canAccessRoute,
  canManageAutomation,
  canViewTeamPage,
} from "../permissions";

describe("permissions", () => {
  it("operator não gere automação", () => {
    expect(canManageAutomation("operator")).toBe(false);
  });

  it("operator não acede billing", () => {
    expect(canAccessBilling("operator", "SAAS")).toBe(false);
  });

  it("operator não acede developer", () => {
    expect(canAccessDeveloperSettings("operator")).toBe(false);
  });

  it("manager não acede developer", () => {
    expect(canAccessDeveloperSettings("manager")).toBe(false);
  });

  it("manager gere automação e vê equipa", () => {
    expect(canManageAutomation("manager")).toBe(true);
    expect(canViewTeamPage("manager")).toBe(true);
  });

  it("platform_admin acede admin da plataforma e developer", () => {
    expect(canAccessPlatformAdmin("platform_admin")).toBe(true);
    expect(canAccessDeveloperSettings("platform_admin")).toBe(true);
  });

  it("billing do manager depende de product mode", () => {
    expect(canAccessBilling("manager", "SAAS")).toBe(true);
    expect(canAccessBilling("manager", "WHITE_LABEL")).toBe(false);
    expect(canAccessBilling("manager", "IMPLEMENTATION")).toBe(false);
  });

  it("/admin/* só platform_admin; /distribuir é operacional para operator/manager", () => {
    expect(canAccessRoute("manager", "/admin/metrics")).toBe(false);
    expect(canAccessRoute("operator", "/admin/whatsapp")).toBe(false);
    expect(canAccessRoute("operator", "/admin/conversations")).toBe(false);
    expect(canAccessRoute("manager", "/api/admin/agent-status")).toBe(false);
    expect(canAccessRoute("platform_admin", "/admin/agents")).toBe(true);
    expect(canAccessRoute("operator", "/distribuir")).toBe(true);
    expect(canAccessRoute("manager", "/distribuir")).toBe(true);
  });
});
