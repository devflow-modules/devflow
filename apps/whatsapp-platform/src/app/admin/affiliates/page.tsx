import type { Metadata } from "next";
import { requireAdminOrMetricsSecretPage } from "@/lib/admin-page-guard";
import { listAffiliatesWithStats } from "@/modules/affiliates/adminAffiliatesService";
import { getWhatsappAppPublicBaseUrl } from "@/modules/affiliates/affiliateSignupLink";
import { AffiliatesAdminClient } from "./AffiliatesAdminClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Afiliados | Admin — WhatsApp Platform",
  description: "Comissões de implantação e parceiros.",
  robots: "noindex, nofollow",
};

export default async function AdminAffiliatesPage() {
  await requireAdminOrMetricsSecretPage("/admin/affiliates");
  const rows = await listAffiliatesWithStats();
  const initialAffiliates = rows.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));
  const publicSignupBaseUrl = getWhatsappAppPublicBaseUrl();
  return (
    <div className="min-h-screen bg-slate-50/80 p-6">
      <AffiliatesAdminClient initialAffiliates={initialAffiliates} publicSignupBaseUrl={publicSignupBaseUrl} />
    </div>
  );
}
