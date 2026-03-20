import type { Metadata } from "next";
import { BillingDashboardClient } from "./BillingDashboardClient";
import { getBillingDashboard } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing e receita | Admin — WhatsApp Platform",
  description: "Dashboard admin de billing, receita e uso.",
  robots: "noindex, nofollow",
};

export default async function AdminBillingPage() {
  const data = await getBillingDashboard();
  return (
    <div className="min-h-screen bg-background">
      <BillingDashboardClient initialData={data} />
    </div>
  );
}
