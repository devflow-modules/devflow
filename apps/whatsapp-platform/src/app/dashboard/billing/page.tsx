import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isOperator } from "@/lib/roles";
import { StateLoading } from "@/components/ui/app-states";
import { BillingDashboardClient } from "./BillingDashboardClient";

export default async function DashboardBillingPage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (auth && isOperator(auth.payload.role)) {
    redirect("/inbox");
  }
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<StateLoading message="A carregar faturação…" />}>
        <BillingDashboardClient />
      </Suspense>
    </div>
  );
}
