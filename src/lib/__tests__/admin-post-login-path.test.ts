import { describe, expect, it } from "vitest";
import { safePortalAdminPostLoginPath } from "../admin-post-login-path";

describe("safePortalAdminPostLoginPath", () => {
  it("usa métricas por omissão quando next inválido ou ausente", () => {
    expect(safePortalAdminPostLoginPath(undefined)).toBe("/admin/metrics");
    expect(safePortalAdminPostLoginPath(null)).toBe("/admin/metrics");
    expect(safePortalAdminPostLoginPath("")).toBe("/admin/metrics");
    expect(safePortalAdminPostLoginPath("/inbox")).toBe("/admin/metrics");
  });

  it("aceita rotas admin internas seguras", () => {
    expect(safePortalAdminPostLoginPath("/admin/leads")).toBe("/admin/leads");
    expect(safePortalAdminPostLoginPath("/admin/lead-finder")).toBe("/admin/lead-finder");
    expect(safePortalAdminPostLoginPath("/admin/metrics")).toBe("/admin/metrics");
  });

  it("rejeita login e open-redirect", () => {
    expect(safePortalAdminPostLoginPath("/admin/login")).toBe("/admin/metrics");
    expect(safePortalAdminPostLoginPath("/admin/login/foo")).toBe("/admin/metrics");
    expect(safePortalAdminPostLoginPath("//evil.com")).toBe("/admin/metrics");
    expect(safePortalAdminPostLoginPath("/admin/https://evil")).toBe("/admin/metrics");
  });
});
