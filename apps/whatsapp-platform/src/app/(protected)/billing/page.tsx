import { Suspense } from "react";
import Link from "next/link";
import { BillingPageClient } from "./BillingPageClient";

export default function BillingPage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">Billing</h1>
      <p className="text-slate-600 text-sm mb-6">
        Plano atual, uso e limites.{" "}
        <Link href="/settings" className="text-blue-600 underline">
          Configurações
        </Link>
      </p>
      <Suspense fallback={<p className="text-slate-600">Carregando…</p>}>
        <BillingPageClient />
      </Suspense>
    </div>
  );
}
