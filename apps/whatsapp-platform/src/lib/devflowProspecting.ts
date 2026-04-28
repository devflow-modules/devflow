import type { UserRole } from "@/modules/auth/authService";

/**
 * CRM de prospecção DevFlow (uso interno).
 *
 * Regras:
 * - Só `platform_admin` pode ver/usar a funcionalidade.
 * - `NEXT_PUBLIC_DEVFLOW_PROSPECTING_ENABLED=false` (ou 0/no/off) desliga mesmo para `platform_admin` (kill-switch em build).
 * - Valor `true` explícito continua a exigir `platform_admin` (não abre a clientes manager/operator).
 */
export function isDevFlowProspectingEnabled(role: UserRole | string | null | undefined): boolean {
  if (role !== "platform_admin") return false;
  const raw = process.env.NEXT_PUBLIC_DEVFLOW_PROSPECTING_ENABLED;
  if (typeof raw !== "string") return true;
  const v = raw.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return true;
}
