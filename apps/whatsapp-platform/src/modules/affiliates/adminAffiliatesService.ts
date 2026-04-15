import { prisma } from "@/lib/prisma";

export type AffiliateListRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commissionRate: number;
  createdAt: Date;
  clientCount: number;
  totalEarned: number;
  pendingTotal: number;
  paidTotal: number;
};

export async function listAffiliatesWithStats(): Promise<AffiliateListRow[]> {
  const affiliates = await prisma.affiliate.findMany({
    orderBy: { createdAt: "desc" },
  });
  if (affiliates.length === 0) return [];

  const [commissionGroups, tenantGroups] = await Promise.all([
    prisma.commission.groupBy({
      by: ["affiliateId", "status"],
      _sum: { amount: true },
    }),
    prisma.tenant.groupBy({
      by: ["affiliateId"],
      where: { affiliateId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const sumByAffiliate = new Map<
    string,
    { total: number; pendente: number; pago: number }
  >();
  for (const a of affiliates) {
    sumByAffiliate.set(a.id, { total: 0, pendente: 0, pago: 0 });
  }
  for (const row of commissionGroups) {
    const cur = sumByAffiliate.get(row.affiliateId);
    if (!cur) continue;
    const amt = row._sum.amount ?? 0;
    cur.total += amt;
    if (row.status === "pendente") cur.pendente += amt;
    if (row.status === "pago") cur.pago += amt;
  }

  const clientsByAffiliate = new Map<string, number>();
  for (const row of tenantGroups) {
    if (row.affiliateId) clientsByAffiliate.set(row.affiliateId, row._count._all);
  }

  return affiliates.map((a) => {
    const sums = sumByAffiliate.get(a.id) ?? { total: 0, pendente: 0, pago: 0 };
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      commissionRate: a.commissionRate,
      createdAt: a.createdAt,
      clientCount: clientsByAffiliate.get(a.id) ?? 0,
      totalEarned: sums.total,
      pendingTotal: sums.pendente,
      paidTotal: sums.pago,
    };
  });
}

export type CommissionListRow = {
  id: string;
  affiliateId: string;
  tenantId: string;
  tenantName: string | null;
  implantationPriceBrl: number | null;
  affiliateCommissionRate: number;
  amount: number;
  type: string;
  status: string;
  createdAt: Date;
};

export async function listCommissionsForAffiliate(affiliateId: string): Promise<CommissionListRow[]> {
  const rows = await prisma.commission.findMany({
    where: { affiliateId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      tenant: { select: { name: true, implantationPriceBrl: true } },
      affiliate: { select: { commissionRate: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    affiliateId: c.affiliateId,
    tenantId: c.tenantId,
    tenantName: c.tenant.name,
    implantationPriceBrl: c.tenant.implantationPriceBrl,
    affiliateCommissionRate: c.affiliate.commissionRate,
    amount: c.amount,
    type: c.type,
    status: c.status,
    createdAt: c.createdAt,
  }));
}
