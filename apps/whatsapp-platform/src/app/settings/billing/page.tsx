import Link from "next/link";
import { BillingSettingsClient } from "./BillingSettingsClient";

export default function BillingSettingsPage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">Billing e uso</h1>
      <p className="text-slate-600 text-sm mb-6">
        Plano base (Stripe) + uso variável (mensagens enviadas e respostas IA).{" "}
        <Link href="/settings" className="text-blue-600 underline">
          Voltar às configurações
        </Link>
      </p>
      <BillingSettingsClient />
    </div>
  );
}
