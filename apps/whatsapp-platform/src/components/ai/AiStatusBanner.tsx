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
      <div className="mt-3 rounded-lg border-2 border-red-400 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-900">
          🚫 Sua IA parou de responder automaticamente
        </p>
        <p className="mt-1 text-sm text-red-800">
          As mensagens estão sendo respondidas de forma limitada. Para voltar ao atendimento automático:
        </p>
        <Link href="/billing" className="mt-3 inline-block">
          <Button size="sm">Fazer upgrade do plano</Button>
        </Link>
      </div>
    );
  }

  if (state === "near_limit") {
    return (
      <div className="mt-3 rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
          ⚠️ Você já usou {percentUsed}% das respostas com IA
        </p>
        <p className="mt-1 text-sm text-amber-800">
          Clientes podem começar a ficar sem resposta automática. Evite perder vendas.
        </p>
        <Link href="/billing" className="mt-3 inline-block">
          <Button size="sm">Evitar parar a IA</Button>
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
