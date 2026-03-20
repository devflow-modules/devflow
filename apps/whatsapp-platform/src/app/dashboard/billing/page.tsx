import { Suspense } from "react";
import Link from "next/link";
import { BillingDashboardClient } from "./BillingDashboardClient";

export default function DashboardBillingPage() {
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
