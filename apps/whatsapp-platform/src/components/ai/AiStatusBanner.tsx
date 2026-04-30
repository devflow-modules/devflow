"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isWhiteLabelMode } from "@/lib/productMode";
import { SupportHelpButton } from "@/components/support/SupportHelpButton";

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
  const wl = isWhiteLabelMode();

  if (state === "disabled" && !enabled) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-muted/60 p-4">
        <p className="text-sm font-medium df-text-primary">IA desativada</p>
        <p className="mt-1 text-sm df-text-secondary">
          Ative o toggle acima para começar a responder clientes automaticamente com IA.
        </p>
      </div>
    );
  }

  if (state === "exceeded") {
    return (
      <div className="mt-3 df-feedback-warning">
        <p className="text-sm font-semibold">
          {wl
            ? "Capacidade de IA da operação esgotada neste período"
            : "Interações de IA incluídas no plano esgotadas neste período"}
        </p>
        <p className="mt-1 text-sm">
          {wl
            ? "Contacte o suporte para alinhar a capacidade e continuar o atendimento com IA."
            : "Faça upgrade para recuperar margem no pacote incluído, ou veja em Plano e faturação como funciona o uso adicional (na fatura: «Uso adicional de IA»)."}
        </p>
        {wl ? (
          <div className="mt-3">
            <SupportHelpButton variant="inline" />
          </div>
        ) : (
          <Link href="/billing" className="mt-3 inline-block">
            <Button variant="secondary" size="sm">
              Ver planos e faturação
            </Button>
          </Link>
        )}
      </div>
    );
  }

  if (state === "near_limit") {
    return (
      <div className="mt-3 df-feedback-warning">
        <p className="text-sm font-semibold">
          {wl
            ? `Próximo da margem de IA da operação (${percentUsed != null ? `${percentUsed}%` : "—"})`
            : `Próximo do que o plano inclui (${percentUsed != null ? `${percentUsed}%` : "—"} das interações de IA)`}
        </p>
        <p className="mt-1 text-sm">
          {wl
            ? "O suporte pode ajudar a ajustar a capacidade antes de atingir o limite."
            : "Isto não interrompe o serviço: além do incluído pode haver expansão de uso, conforme a sua fatura."}
        </p>
        {wl ? (
          <div className="mt-3">
            <SupportHelpButton variant="inline" />
          </div>
        ) : (
          <Link href="/billing" className="mt-3 inline-block">
            <Button size="sm" variant="outline">
              Rever plano e limites
            </Button>
          </Link>
        )}
      </div>
    );
  }

  if (state === "active") {
    const remaining = limit != null ? limit - used : null;
    return (
      <div className="mt-3 df-feedback-success">
        <p className="text-sm font-medium">IA ativa</p>
        {remaining != null && remaining > 0 ? (
          <p className="mt-1 text-sm">
            Você ainda pode usar: <strong>{remaining} respostas com IA</strong> este mês.
          </p>
        ) : (
          <p className="mt-1 text-sm">
            {used} respostas IA este mês
            {!wl && planName ? ` (plano ${planName})` : ""}.
          </p>
        )}
        {!wl ? (
          <Link href="/settings/ai-analytics" className="mt-2 inline-block text-sm underline opacity-90 hover:opacity-100">
            Ver uso detalhado →
          </Link>
        ) : (
          <p className="mt-2 text-sm">Para detalhes de uso, contacte o suporte.</p>
        )}
      </div>
    );
  }

  return null;
}
