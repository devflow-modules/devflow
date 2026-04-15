import type { Commission } from "@/generated/prisma-whatsapp";
import { TenantGtmLifecycle } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { COMMISSION_TYPE_IMPLANTACAO } from "./schemas";

export type CommissionSkipReason =
  | "NOT_IMPLANTADO"
  | "NO_AFFILIATE"
  | "NO_IMPLANTATION_PRICE"
  | "AFFILIATE_NOT_FOUND";

export type EnsureImplantationCommissionResult =
  | { ok: true; commission: Commission; created: boolean }
  | { ok: false; reason: CommissionSkipReason };

export function serializeCommissionAttempt(result: EnsureImplantationCommissionResult): {
  commission: Commission | null;
  commissionCreated: boolean;
  commissionSkippedReason: CommissionSkipReason | null;
} {
  if (result.ok) {
    return {
      commission: result.commission,
      commissionCreated: result.created,
      commissionSkippedReason: null,
    };
  }
  return {
    commission: null,
    commissionCreated: false,
    commissionSkippedReason: result.reason,
  };
}

/** Base usada na comissão: só valor explícito no tenant (produção). */
export function commissionBaseFromTenant(implantationPriceBrl: number | null | undefined): number | null {
  if (implantationPriceBrl == null || !Number.isFinite(implantationPriceBrl) || implantationPriceBrl <= 0) {
    return null;
  }
  return implantationPriceBrl;
}

/**
 * Referência para UI / documentação — não substitui `implantationPriceBrl` no cálculo da comissão.
 * Override: `AFFILIATE_IMPLANTATION_BASE_BRL`.
 */
export function getImplantationBaseBrl(): number {
  const raw = process.env.AFFILIATE_IMPLANTATION_BASE_BRL?.trim();
  const n = raw ? Number.parseFloat(raw) : NaN;
  if (Number.isFinite(n) && n > 0) return n;
  return 3500;
}

/**
 * Se o tenant está IMPLANTADO, com afiliado, com `implantationPriceBrl` > 0 e ainda não existe comissão
 * de implantação, cria uma linha. Idempotente (`@@unique([tenantId, type])`).
 */
export async function ensureImplantationCommission(
  tenantId: string
): Promise<EnsureImplantationCommissionResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      gtmLifecycle: true,
      affiliateId: true,
      implantationPriceBrl: true,
    },
  });
  if (!tenant || tenant.gtmLifecycle !== TenantGtmLifecycle.IMPLANTADO) {
    return { ok: false, reason: "NOT_IMPLANTADO" };
  }
  if (!tenant.affiliateId) {
    return { ok: false, reason: "NO_AFFILIATE" };
  }

  const base = commissionBaseFromTenant(tenant.implantationPriceBrl);
  if (base == null) {
    return { ok: false, reason: "NO_IMPLANTATION_PRICE" };
  }

  const existing = await prisma.commission.findUnique({
    where: {
      tenantId_type: { tenantId, type: COMMISSION_TYPE_IMPLANTACAO },
    },
  });
  if (existing) {
    return { ok: true, commission: existing, created: false };
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { id: tenant.affiliateId },
    select: { id: true, commissionRate: true },
  });
  if (!affiliate) {
    return { ok: false, reason: "AFFILIATE_NOT_FOUND" };
  }

  const amount = Math.round(base * affiliate.commissionRate * 100) / 100;

  try {
    const commission = await prisma.commission.create({
      data: {
        affiliateId: affiliate.id,
        tenantId,
        amount,
        type: COMMISSION_TYPE_IMPLANTACAO,
        status: "pendente",
      },
    });
    recordPlatformAudit({
      action: "affiliate.commission.created",
      tenantId,
      resourceType: "commission",
      resourceId: commission.id,
      metadata: {
        affiliateId: affiliate.id,
        amount,
        baseBrl: base,
        commissionRate: affiliate.commissionRate,
        type: COMMISSION_TYPE_IMPLANTACAO,
      },
    });
    return { ok: true, commission, created: true };
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      const again = await prisma.commission.findUnique({
        where: { tenantId_type: { tenantId, type: COMMISSION_TYPE_IMPLANTACAO } },
      });
      if (again) return { ok: true, commission: again, created: false };
    }
    throw e;
  }
}
