import { prisma } from "@/lib/prisma";
import { COMMISSION_TYPE_IMPLANTACAO } from "./schemas";

const AFFILIATE_AUDIT_ACTIONS = [
  "affiliate.assigned",
  "affiliate.commission.created",
  "affiliate.commission.paid",
  "affiliate.linked_manual",
] as const;

export type AdminTenantAffiliateAuditRow = {
  id: string;
  action: string;
  createdAt: Date;
  metadata: unknown;
};

export type AdminTenantAffiliatePanel = {
  tenant: {
    id: string;
    name: string | null;
    affiliateId: string | null;
    affiliateSource: string | null;
    implantationPriceBrl: number | null;
    gtmLifecycle: string;
  };
  affiliate: null | {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    commissionRate: number;
  };
  commission: null | {
    id: string;
    amount: number;
    status: string;
    type: string;
    createdAt: Date;
  };
  expectedCommissionBrl: number | null;
  auditTail: AdminTenantAffiliateAuditRow[];
};

export async function getAdminTenantAffiliatePanel(tenantId: string): Promise<AdminTenantAffiliatePanel | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      affiliateId: true,
      affiliateSource: true,
      implantationPriceBrl: true,
      gtmLifecycle: true,
      affiliate: {
        select: { id: true, name: true, email: true, phone: true, commissionRate: true },
      },
    },
  });
  if (!tenant) return null;

  const commission = await prisma.commission.findUnique({
    where: { tenantId_type: { tenantId, type: COMMISSION_TYPE_IMPLANTACAO } },
    select: { id: true, amount: true, status: true, type: true, createdAt: true },
  });

  let expectedCommissionBrl: number | null = null;
  if (
    tenant.implantationPriceBrl != null &&
    tenant.implantationPriceBrl > 0 &&
    tenant.affiliate &&
    tenant.affiliate.commissionRate > 0
  ) {
    expectedCommissionBrl =
      Math.round(tenant.implantationPriceBrl * tenant.affiliate.commissionRate * 100) / 100;
  }

  const auditTail = await prisma.auditLog.findMany({
    where: {
      tenantId,
      action: { in: [...AFFILIATE_AUDIT_ACTIONS] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, createdAt: true, metadata: true },
  });

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      affiliateId: tenant.affiliateId,
      affiliateSource: tenant.affiliateSource,
      implantationPriceBrl: tenant.implantationPriceBrl,
      gtmLifecycle: tenant.gtmLifecycle,
    },
    affiliate: tenant.affiliate,
    commission,
    expectedCommissionBrl,
    auditTail,
  };
}
