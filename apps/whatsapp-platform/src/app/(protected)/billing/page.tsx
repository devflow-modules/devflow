import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StateLoading } from "@/components/ui/app-states";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isOperator } from "@/lib/roles";
import { BillingPageClient } from "./BillingPageClient";

export default async function BillingPage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (auth && isOperator(auth.payload.role)) {
    redirect("/inbox");
  }
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Conta"
        title="Plano e faturação"
        description="Veja o nível da operação, o consumo do período e a renovação. O painel em Dashboard oferece a mesma visão com comparação de planos e atalhos para o portal Stripe."
        layout="split"
        showDivider
        tone="admin"
      />
      <Suspense fallback={<StateLoading message="A carregar dados de faturação…" />}>
        <BillingPageClient />
      </Suspense>
    </div>
  );
}
