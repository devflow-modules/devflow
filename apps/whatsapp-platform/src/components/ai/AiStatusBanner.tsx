"use client";

import Link from "next/link";
import { Button } from "@devflow/ui";

export type AiBannerState = "disabled" | "active" | "near_limit" | "exceeded";

type Props = {
  state: AiBannerState;
  enabled: boolean;
  used?: number;
  limit?: number | null;
  percentUsed?: number | null;
  planName?: string;
};

export function AiStatusBanner({
  state,
  enabled,
  used = 0,
  limit,
  percentUsed,
  planName,
}: Props) {
  if (state === "disabled" && !enabled) {
    return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-800">IA desativada</p>
        <p className="mt-1 text-sm text-slate-600">
          Ative o toggle acima para começar a responder clientes automaticamente com IA.
        </p>
      </div>
    );
  }

  if (state === "exceeded") {
    return (
      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50/95 p-4">
        <p className="text-sm font-semibold text-amber-950">
          Interações de IA incluídas no plano esgotadas neste período
        </p>
        <p className="mt-1 text-sm text-amber-900/95">
          Faça upgrade para recuperar margem no pacote incluído, ou veja em Plano e faturação como funciona o uso
          adicional (na fatura: «Uso adicional de IA»).
        </p>
        <Link href="/billing" className="mt-3 inline-block">
          <Button size="sm">Ver planos e faturação</Button>
        </Link>
      </div>
    );
  }

  if (state === "near_limit") {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
        <p className="text-sm font-semibold text-amber-950">
          Próximo do que o plano inclui ({percentUsed != null ? `${percentUsed}%` : "—"} das interações de IA)
        </p>
        <p className="mt-1 text-sm text-amber-900/90">
          Isto não interrompe o serviço: além do incluído pode haver expansão de uso, conforme a sua fatura.
        </p>
        <Link href="/billing" className="mt-3 inline-block">
          <Button size="sm" variant="outline">
            Rever plano e limites
          </Button>
        </Link>
      </div>
    );
  }

  if (state === "active") {
    const remaining = limit != null ? limit - used : null;
    return (
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">IA ativa</p>
        {remaining != null && remaining > 0 ? (
          <p className="mt-1 text-sm text-emerald-800">
            Você ainda pode usar: <strong>{remaining} respostas com IA</strong> este mês.
          </p>
        ) : (
          <p className="mt-1 text-sm text-emerald-800">
            {used} respostas IA este mês{planName ? ` (plano ${planName})` : ""}.
          </p>
        )}
        <Link href="/settings/ai-analytics" className="mt-2 inline-block text-sm text-emerald-700 hover:underline">
          Ver uso detalhado →
        </Link>
      </div>
    );
  }

  return null;
}
