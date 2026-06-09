"use client";

import { Inbox, ListOrdered, RadioReceiver } from "lucide-react";
import type { DemoOpsStatus } from "@/modules/demo";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<DemoOpsStatus, string> = {
  nova: "Nova",
  bot_ativo: "Bot ativo",
  aguardando_humano: "Aguardando humano",
  na_fila: "Na fila",
};

const STATUS_STYLE: Record<DemoOpsStatus, string> = {
  nova: "bg-muted df-text-secondary ring-1 ring-border/55",
  bot_ativo: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  aguardando_humano: "bg-amber-50 text-amber-900 ring-amber-200",
  na_fila: "bg-blue-50 text-blue-900 ring-blue-200",
};

type DemoOpsPanelVariant =
  | { variant: "empty" }
  | {
      variant: "active";
      scenarioLabel: string;
      threadPreview: string;
      status: DemoOpsStatus;
      queueHint: string;
    };

export function DemoOpsPanel(props: DemoOpsPanelVariant) {
  if (props.variant === "empty") {
    return (
      <aside
        className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center shadow-sm"
        aria-label="Painel operacional — estado vazio"
      >
        <p className="text-sm font-medium text-foreground">Painel operacional (simulado)</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma conversa na fila ainda. Avance o fluxo guiado acima ou escolha um segmento abaixo para ver status,
          handoff e fila em tempo real — tudo local, sem API externa.
        </p>
      </aside>
    );
  }

  const { scenarioLabel, threadPreview, status, queueHint } = props;

  return (
    <aside
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
      aria-label="Prévia operacional da demonstração"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Evidência operacional (simulada)
      </p>
      <p className="mt-1 text-sm text-foreground">
        O que sua equipe veria no painel — sem dados reais nem rede.
      </p>

      <ul className="mt-4 space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="mt-0.5 text-primary">
            <RadioReceiver className="size-4" aria-hidden />
          </span>
          <div>
            <p className="font-medium text-foreground">Conversa recebida</p>
            <p className="text-muted-foreground line-clamp-2">{threadPreview}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Cenário: {scenarioLabel}</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 text-primary">
            <ListOrdered className="size-4" aria-hidden />
          </span>
          <div>
            <p className="font-medium text-foreground">Status do atendimento</p>
            <span
              className={cn(
                "mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                STATUS_STYLE[status]
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 text-primary">
            <Inbox className="size-4" aria-hidden />
          </span>
          <div>
            <p className="font-medium text-foreground">Fila / inbox</p>
            <p className="text-muted-foreground">{queueHint}</p>
          </div>
        </li>
      </ul>
    </aside>
  );
}
