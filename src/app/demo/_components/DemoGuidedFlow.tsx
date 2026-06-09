"use client";

import { useState } from "react";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  UserRound,
  Zap,
} from "lucide-react";
import { trackDemoGuidedStep } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { DemoOperationalDashboard } from "./DemoOperationalDashboard";
import { cn } from "@/lib/utils";

const STEPS: {
  id: number;
  title: string;
  summary: string;
  dashboardHighlight: "bot" | "human" | "sla" | "waiting" | "opportunity" | null;
}[] = [
  {
    id: 1,
    title: "Cliente chama no WhatsApp",
    summary: "Mensagem entra pelo canal oficial — sem número espelhado.",
    dashboardHighlight: null,
  },
  {
    id: 2,
    title: "IA entende a intenção",
    summary: "Triagem automática classifica o pedido antes de responder ou escalar.",
    dashboardHighlight: "bot",
  },
  {
    id: 3,
    title: "IA responde o repetitivo",
    summary: "Dúvidas frequentes saem do caminho da equipe — 24h, com contexto.",
    dashboardHighlight: "bot",
  },
  {
    id: 4,
    title: "Caso exige humano",
    summary: "Negociação, exceção ou oportunidade comercial → handoff imediato.",
    dashboardHighlight: "human",
  },
  {
    id: 5,
    title: "Operação acompanha",
    summary: "Inbox, fila, SLA e dashboard mostram quem responde e o que está em risco.",
    dashboardHighlight: "sla",
  },
];

function StepContent({ stepId }: { stepId: number }) {
  if (stepId === 1) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp · cliente
        </div>
        <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
          Olá, quero saber se vocês entregam hoje e qual o prazo.
        </div>
      </div>
    );
  }

  if (stepId === 2) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border df-bg-info-soft p-4">
          <div className="flex items-center gap-2 text-xs font-semibold df-status-info">
            <Zap className="size-4" aria-hidden />
            Análise da IA
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="df-text-secondary">Intenção detectada</dt>
              <dd className="font-semibold text-foreground">Prazo de entrega</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="df-text-secondary">Tipo</dt>
              <dd className="font-semibold text-foreground">Dúvida repetitiva</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="df-text-secondary">Ação</dt>
              <dd className="font-semibold text-primary">Resposta automática</dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  if (stepId === 3) {
    return (
      <div className="space-y-3">
        <div className="max-w-[90%] rounded-2xl rounded-tl-md border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground">
          <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Bot className="size-3" aria-hidden />
            Assistente IA
          </span>
          Entregamos hoje até 22h. Para calcular o prazo, me envie seu bairro.
        </div>
        <p className="df-text-secondary text-xs leading-relaxed">
          Repetitivo resolvido sem escalar — equipe livre para o que importa.
        </p>
      </div>
    );
  }

  if (stepId === 4) {
    return (
      <div className="space-y-3">
        <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
          Consigo negociar um pedido maior para evento hoje?
        </div>
        <div className="rounded-xl border df-bg-warning-soft p-4">
          <div className="flex items-center gap-2 text-xs font-semibold df-status-warning">
            <UserRound className="size-4" aria-hidden />
            Handoff humano
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="df-text-secondary">Intenção detectada</dt>
              <dd className="font-semibold text-foreground">Oportunidade comercial</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="df-text-secondary">Ação</dt>
              <dd className="font-semibold df-status-warning">Handoff para atendente</dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Painel da conversa
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {[
          ["Status", "Com atendente"],
          ["SLA", "8 min restantes"],
          ["Prioridade", "Alta"],
          ["Responsável", "Equipe comercial"],
          ["Origem", "WhatsApp"],
          ["Próxima ação", "Responder proposta"],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-lg bg-card px-3 py-2">
            <dt className="df-text-secondary text-[10px] font-medium uppercase tracking-wide">{label}</dt>
            <dd className="font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DemoGuidedFlow() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const goToStep = (index: number, action: "tab" | "next" | "prev") => {
    const next = STEPS[index];
    if (!next) return;
    setStepIndex(index);
    trackDemoGuidedStep({ step: next.id, stepTitle: next.title, action });
  };

  return (
    <section aria-labelledby="demo-guided-flow-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="demo-guided-flow-heading"
            className="mt-4 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Fluxo guiado: da mensagem ao dashboard
          </h2>
          <p className="df-text-secondary mt-3 text-sm leading-relaxed sm:text-base">
            Cinco etapas mostram como IA, handoff humano, fila e SLA funcionam juntos numa operação real.
          </p>
        </div>
        <p className="df-text-muted text-sm font-medium lg:pt-6">
          Etapa {step.id} de {STEPS.length}
        </p>
      </div>

      <nav
        className="mt-8 flex gap-2 overflow-x-auto pb-1"
        aria-label="Etapas da demonstração"
      >
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goToStep(i, "tab")}
            aria-current={i === stepIndex ? "step" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              i === stepIndex
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            {s.id}. {s.title}
          </button>
        ))}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start">
        <article className="df-surface-elevated rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
          <p className="df-text-secondary mt-1 text-sm leading-relaxed">{step.summary}</p>
          <div className="mt-5 min-h-[8rem]">
            <StepContent stepId={step.id} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={isFirst}
              onClick={() => goToStep(Math.max(0, stepIndex - 1), "prev")}
              aria-label="Etapa anterior"
              className="inline-flex items-center gap-1.5"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Anterior
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isLast}
              onClick={() => goToStep(Math.min(STEPS.length - 1, stepIndex + 1), "next")}
              aria-label="Próxima etapa"
              className="inline-flex items-center gap-1.5"
            >
              Próxima etapa
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </article>

        <DemoOperationalDashboard highlight={step.dashboardHighlight} />
      </div>
    </section>
  );
}
