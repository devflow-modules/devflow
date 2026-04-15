import type { Metadata } from "next";
import { requireAdminOrMetricsSecretPage } from "@/lib/admin-page-guard";
import { TenantAdminClient } from "./TenantAdminClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Tenant ${id.slice(0, 8)}… | Admin`,
    robots: "noindex, nofollow",
  };
}

export default async function AdminTenantDetailPage({ params }: PageProps) {
  const { id } = await params;
  await requireAdminOrMetricsSecretPage(`/admin/tenants/${id}`);
  return <TenantAdminClient tenantId={id} />;
}
