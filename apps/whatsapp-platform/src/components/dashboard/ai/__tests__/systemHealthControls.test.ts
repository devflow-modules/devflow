import { describe, it, expect } from "vitest";
import {
  LEGACY_ADMIN_OPERATIONS_PATH,
  PLATFORM_REPROCESS_FOLLOWUPS_PATH,
  PLATFORM_RUN_WORKER_PATH,
  TENANT_OPERATIONS_PATH,
  canManageTenantOperationalControls,
  canRunPlatformOperationalJobs,
} from "../systemHealthControls";

describe("systemHealthControls (dashboard-ai F0)", () => {
  it("nunca aponta pause/resume para a rota 410 legada", () => {
    expect(TENANT_OPERATIONS_PATH).toBe("/api/operations/tenant");
    expect(TENANT_OPERATIONS_PATH).not.toBe(LEGACY_ADMIN_OPERATIONS_PATH);
    expect(LEGACY_ADMIN_OPERATIONS_PATH).toBe("/api/admin/operations");
  });

  it("paths de plataforma permanecem em /api/admin/*", () => {
    expect(PLATFORM_RUN_WORKER_PATH).toBe("/api/admin/run-worker");
    expect(PLATFORM_REPROCESS_FOLLOWUPS_PATH).toBe("/api/admin/reprocess-followups");
  });

  it("tenant controls: fail-closed em loading / null / operator", () => {
    expect(canManageTenantOperationalControls(null, true)).toBe(false);
    expect(canManageTenantOperationalControls(null, false)).toBe(false);
    expect(canManageTenantOperationalControls("operator")).toBe(false);
  });

  it("tenant controls: manager e platform_admin", () => {
    expect(canManageTenantOperationalControls("manager")).toBe(true);
    expect(canManageTenantOperationalControls("platform_admin")).toBe(true);
  });

  it("platform jobs: só platform_admin; manager e loading bloqueados", () => {
    expect(canRunPlatformOperationalJobs("platform_admin")).toBe(true);
    expect(canRunPlatformOperationalJobs("manager")).toBe(false);
    expect(canRunPlatformOperationalJobs("operator")).toBe(false);
    expect(canRunPlatformOperationalJobs(null, true)).toBe(false);
    expect(canRunPlatformOperationalJobs("platform_admin", true)).toBe(false);
  });
});
