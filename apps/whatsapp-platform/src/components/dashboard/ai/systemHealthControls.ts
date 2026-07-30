import type { UserRole } from "@/modules/auth";
import { isPlatformAdmin, isTenantManager } from "@/lib/roles";

/** Endpoint canónico para pause/resume de IA e automação do tenant. */
export const TENANT_OPERATIONS_PATH = "/api/operations/tenant";

export const PLATFORM_RUN_WORKER_PATH = "/api/admin/run-worker";
export const PLATFORM_REPROCESS_FOLLOWUPS_PATH = "/api/admin/reprocess-followups";

/** Rota descontinuada (410) — a UI nunca deve chamar isto. */
export const LEGACY_ADMIN_OPERATIONS_PATH = "/api/admin/operations";

/**
 * Controlos tenant (pausar/ativar IA e automação).
 * Fail-closed enquanto a role ainda não é conhecida.
 */
export function canManageTenantOperationalControls(
  role: UserRole | string | null | undefined,
  roleLoading = false
): boolean {
  if (roleLoading || !role) return false;
  return isTenantManager(role);
}

/**
 * Jobs de plataforma (worker / reprocessar). Só `platform_admin`.
 * Fail-closed enquanto a role ainda não é conhecida.
 */
export function canRunPlatformOperationalJobs(
  role: UserRole | string | null | undefined,
  roleLoading = false
): boolean {
  if (roleLoading || !role) return false;
  return isPlatformAdmin(role);
}
