"use client";

import { cn } from "@/lib/utils";

type Step = { title: string; body: string };

const INVESTIGA_STEPS: Step[] = [
  {
    title: "Problema",
    body: "Dados de CNPJ espalhados e difíceis de mostrar em call.",
  },
  {
    title: "Como funciona",
    body: "Um clique revela o formato de resposta que o cliente reconhece.",
  },
  {
    title: "Resultado",
    body: "Ficha clara + no produto, histórico e time acompanham.",
  },
  {
    title: "Próximo passo",
    body: "Consulta real grátis ou evolução para o Investiga+.",
  },
];

const FUNKLAB_STEPS: Step[] = [
  {
    title: "Problema",
    body: "Começar do zero no groove consome tempo na DAW.",
  },
  {
    title: "Como funciona",
    body: "Preset + BPM → o engine propõe variações de MIDI.",
  },
  {
    title: "Resultado",
    body: "Arquivos nomeados e prontos para importar.",
  },
  {
    title: "Próximo passo",
    body: "Abrir a demo ao vivo e testar na sua sessão.",
  },
];

type Variant = "investigamais" | "funklab";

export function DemoMicroStory(props: {
  variant: Variant;
  className?: string;
}) {
  const steps = props.variant === "funklab" ? FUNKLAB_STEPS : INVESTIGA_STEPS;

  return (
    <ol
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        props.className
      )}
      aria-label="Resumo da demo em quatro passos"
    >
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="rounded-xl border border-border bg-card/90 p-4 text-left shadow-sm"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {i + 1}. {step.title}
          </span>
          <p className="mt-2 text-sm leading-snug text-muted-foreground">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
