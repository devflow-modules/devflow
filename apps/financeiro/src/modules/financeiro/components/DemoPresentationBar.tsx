"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/modules/financeiro/lib/cn";
import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";

const BASE = FINANCEIRO_BASE_PATH;

const STEPS: { href: string; label: string; hint: string }[] = [
  { href: `${BASE}/onboarding`, label: "1. Casa", hint: "criar o espaço" },
  { href: `${BASE}/dashboard`, label: "2. Dashboard", hint: "clareza do mês" },
  { href: `${BASE}/sources`, label: "3. Fontes", hint: "PJ separado de PF" },
  { href: `${BASE}/expenses`, label: "4. Lançamentos", hint: "entradas e saídas" },
  { href: `${BASE}/rules`, label: "5. Regras", hint: "rateio e previsão" },
  { href: "/upgrade", label: "6. Planos", hint: "escalar uso" },
];

type Props = { pathname: string };

export function DemoPresentationBar({ pathname }: Props) {
  const enabled =
    typeof process.env.NEXT_PUBLIC_FINANCEIRO_DEMO_BANNER === "string"
      ? process.env.NEXT_PUBLIC_FINANCEIRO_DEMO_BANNER === "true"
      : false;

  const activeHref = useMemo(() => {
    const match = STEPS.find(
      (s) => pathname === s.href || (s.href !== "/upgrade" && pathname.startsWith(`${s.href}/`))
    );
    return match?.href;
  }, [pathname]);

  if (!enabled) return null;

  return (
    <div
      className="border-b border-amber-200 bg-amber-50/95 px-4 py-3 text-amber-950 backdrop-blur sm:px-6"
      role="region"
      aria-label="Modo demonstração comercial"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
            Demo comercial
          </span>
          <p className="text-sm font-medium text-amber-950">
            Roteiro sugerido para apresentação (~5 min) — dados reais só após o seed no ambiente de demo.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Passos da demonstração">
          {STEPS.map((step) => {
            const isActive = step.href === activeHref || pathname === step.href;
            return (
              <Link
                key={step.href}
                href={step.href}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "border-amber-600 bg-amber-100 text-amber-950"
                    : "border-amber-200/80 bg-white/80 text-amber-900 hover:bg-amber-100"
                )}
                title={step.hint}
              >
                {step.label}
              </Link>
            );
          })}
        </nav>
        <details className="text-xs text-amber-900/90">
          <summary className="cursor-pointer font-semibold text-amber-950">Operação: seed e reset</summary>
          <p className="mt-2 max-w-3xl leading-relaxed">
            No diretório <code className="rounded bg-amber-100/80 px-1">apps/financeiro</code>, com o e-mail do
            usuário demo:{" "}
            <code className="block whitespace-pre-wrap rounded bg-amber-100/80 p-2 font-mono text-[11px] sm:inline sm:p-1">
              npx tsx scripts/seed-financeiro-demo.ts --email seu@email.com
            </code>{" "}
            Use <code className="rounded bg-amber-100/80 px-1">--reset-demo</code> antes para limpar só artefatos
            marcados como demo (nomes estáveis no código). Logs: prefixo{" "}
            <code className="rounded bg-amber-100/80 px-1">[financeiro-demo]</code>.
          </p>
        </details>
      </div>
    </div>
  );
}
