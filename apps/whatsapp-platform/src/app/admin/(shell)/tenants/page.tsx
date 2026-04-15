import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminOrMetricsSecretPage } from "@/lib/admin-page-guard";
import { prisma } from "@/lib/prisma";
import { TenantsAdminListClient } from "./TenantsAdminListClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tenants | Admin — WhatsApp Platform",
  description: "Lista rápida de tenants para operação interna.",
  robots: "noindex, nofollow",
};

export default async function AdminTenantsIndexPage() {
  await requireAdminOrMetricsSecretPage("/admin/tenants");
  const rows = await prisma.tenant.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      plan: true,
      affiliateId: true,
      affiliateSource: true,
      gtmLifecycle: true,
    },
  });
  const initialRows = rows.map((t) => ({
    id: t.id,
    name: t.name,
    plan: t.plan,
    affiliateId: t.affiliateId,
    affiliateSource: t.affiliateSource,
    gtmLifecycle: t.gtmLifecycle,
  }));
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plataforma</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Tenants</h1>
      <p className="mt-1 text-sm text-slate-600">
        Filtros, badges e detalhe (afiliado, comissão, auditoria). Ordenado por última actualização.
      </p>
      <div className="mt-6">
        {initialRows.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
            Sem tenants na base.
          </p>
        ) : (
          <TenantsAdminListClient initialRows={initialRows} />
        )}
      </div>
      <p className="mt-4 text-sm">
        <Link href="/admin/affiliates" className="font-medium text-slate-700 underline-offset-4 hover:underline">
          ← Afiliados
        </Link>
      </p>
    </div>
  );
}
