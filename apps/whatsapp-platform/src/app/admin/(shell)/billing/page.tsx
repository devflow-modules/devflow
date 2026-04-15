import type { Metadata } from "next";
import { requireAdminOrMetricsSecretPage } from "@/lib/admin-page-guard";
import { BillingDashboardClient } from "./BillingDashboardClient";
import { getBillingDashboard } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing e receita | Admin — WhatsApp Platform",
  description: "Dashboard admin de billing, receita e uso.",
  robots: "noindex, nofollow",
};

export default async function AdminBillingPage() {
  await requireAdminOrMetricsSecretPage("/admin/billing");
  const data = await getBillingDashboard();
  return <BillingDashboardClient initialData={data} />;
}
