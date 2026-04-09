import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isAgent } from "@/lib/roles";
import { BillingDashboardClient } from "./BillingDashboardClient";

export default async function DashboardBillingPage() {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (auth && isAgent(auth.payload.role)) {
    redirect("/inbox");
  }
  return (
    <div className="min-h-screen p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-2">Billing e uso</h1>
      <p className="text-slate-600 text-sm mb-6">
        Plano atual, uso de mensagens e IA, excedente e previsão de cobrança.{" "}
        <Link href="/settings" className="text-blue-600 underline">
          Configurações
        </Link>
      </p>
      <Suspense fallback={<p className="text-slate-600">Carregando…</p>}>
        <BillingDashboardClient />
      </Suspense>
    </div>
  );
}
