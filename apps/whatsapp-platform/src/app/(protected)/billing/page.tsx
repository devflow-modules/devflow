import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { BILLING_PAGE_HEADER_DESCRIPTION } from "@/modules/billing/planPresentation";
import { StateLoading } from "@/components/ui/app-states";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isCommercialBillingVisible } from "@/lib/productMode";
import { canAccessBilling } from "@/lib/permissions";
import { BillingPageClient } from "./BillingPageClient";

export default async function BillingPage() {
  if (!isCommercialBillingVisible()) redirect("/dashboard");
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (auth && !canAccessBilling(auth.payload.role, "SAAS")) {
    redirect("/inbox");
  }
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Conta"
        title="Contrato e uso"
        description={BILLING_PAGE_HEADER_DESCRIPTION}
        layout="split"
        showDivider
        tone="admin"
      />
      <Suspense fallback={<StateLoading message="A carregar contrato e uso…" />}>
        <BillingPageClient />
      </Suspense>
    </div>
  );
}
