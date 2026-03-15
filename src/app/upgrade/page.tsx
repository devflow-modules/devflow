import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Plans } from "@/modules/billing/plans";
import { UpgradeCta } from "./UpgradeCta";

export const metadata: Metadata = {
  title: "Upgrade | DevFlow",
  description: "Faça upgrade do seu plano.",
  robots: "noindex, nofollow",
};

const proBenefits = [
  "Até 5 casas",
  "Até 50 regras de rateio",
  "Regras avançadas",
  "Exportação de dados",
  "Analytics avançado",
];

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Upgrade</h1>
        <p className="mb-8 text-muted-foreground">
          Seu plano atual: <strong className="text-foreground">FREE</strong> (até{" "}
          {Plans.FREE.maxHouseholds} casa, {Plans.FREE.maxRules} regras).
        </p>

        <div className="rounded-2xl border border-primary bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">Plano PRO</h2>
          <ul className="mt-4 space-y-2 text-sm text-foreground">
            {proBenefits.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <UpgradeCta />
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Pagamento em breve. Entre em contato para PRO ou TEAM.
        </p>
        <p className="mt-2 text-center">
          <Link href="/pricing" className="text-sm text-primary hover:underline">
            Ver todos os planos
          </Link>
        </p>
      </main>
    </div>
  );
}
