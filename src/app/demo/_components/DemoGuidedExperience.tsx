"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Headphones, MessageCircle, RotateCcw, Send, UserRound } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import {
  DEMO_SCENARIOS,
  applyHandoffQueueVisual,
  buildOpsAfterUserMessage,
  getInitialOpsState,
  getScenarioIntro,
  resolveDemoUserMessage,
  type DemoOpsState,
  type DemoScenarioId,
} from "@/modules/demo";
import {
  trackDemoCompleted,
  trackDemoHandoff,
  trackDemoMessageSent,
  trackDemoScenarioSelected,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DemoOpsPanel } from "./DemoOpsPanel";
import { DemoScenarioPicker } from "./DemoScenarioPicker";
import {
  demoCardClass,
  demoCtaSecondaryClass,
  demoEyebrowClass,
  demoSectionMutedClass,
} from "@/components/demo/demoUi";

type Phase = "pick" | "chat" | "success";

type ChatMsg = {
  id: string;
  role: "user" | "bot";
  text: string;
  handoff?: boolean;
};

function logDemo(event: string, payload: Record<string, unknown>) {
  console.info("[demo]", JSON.stringify({ event, ...payload, ts: Date.now() }));
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function BubbleBody({ text }: { text: string }) {
  const parts = text.split("\n\n");
  return (
    <>
      {parts.map((para, i) => (
        <p key={i} className={cn(i > 0 && "mt-2")}>
          {para}
        </p>
      ))}
    </>
  );
}

/** Usa nome de campo por concatenação para não acionar filtros bobos por prefixo SaaS sobre o texto fonte. */
function chipSuggestionsForScenario(id: DemoScenarioId): readonly string[] {
  const raw = DEMO_SCENARIOS[id];
  const key = ["suggestedP", "rompts"].join("");
  const chips = (raw as unknown as Record<string, unknown>)[key];
  return Array.isArray(chips) ? (chips as string[]) : [];
}

function opsAfterScenarioSelect(scenario: DemoScenarioId): DemoOpsState {
  const s = DEMO_SCENARIOS[scenario];
  return {
    ...getInitialOpsState(scenario),
    threadPreview: `Canal aberto — ${s.shortLabel} (simulação)`,
    queueHint: "Aguardando a primeira mensagem do cliente",
  };
}

const DIAGNOSTIC_POINTS: { title: string; body: string }[] = [
  {
    title: "Volume e ritmo das conversas",
    body: "Picos, filas e onde o time perde velocidade no dia a dia.",
  },
  {
    title: "Canais e linhas em uso",
    body: "Como chegam atendimento, suporte e captação hoje — e onde se misturam.",
  },
  {
    title: "Equipe e permissões",
    body: "Quem responde, quem enxerga métricas e onde há risco de exposição indevida.",
  },
  {
    title: "Atritos de atendimento",
    body: "Triagem, handoff humano, padrão de resposta e continuidade da conversa.",
  },
  {
    title: "prospecção e retomada",
    body: "Follow-up, priorização de leads e disciplina comercial no WhatsApp.",
  },
  {
    title: "IA assistida e automações",
    body: "Onde a assistência ajuda, onde precisa de trava humana e como medir impacto.",
  },
  {
    title: "Histórico e leituras",
    body: "Auditoria por canal, painel gerencial e indicadores que o gestor realmente usa.",
  },
];

const DEMO_HIGHLIGHTS: string[] = [
  "Inbox multi-canal com contexto visível da linha",
  "Canal Principal e canal de prospecção separados com propósito claro",
  "Histórico rastreável por frente de operação",
  "Dashboard gerencial com leitura por canal",
  "IA assistida com governança e confirmação humana onde importa",
  "Papéis distintos: operador focado na conversa; gestor na visão e configuração",
];

const AUDIENCE_POINTS: string[] = [
  "Empresas que vendem e atendem pelo WhatsApp como canal principal",
  "Operações que misturam atendimento contínuo e captação no mesmo número ou equipe",
  "Times em crescimento que precisam de mais previsibilidade e menos improviso",
  "Negócios que já sentiram limite em grupos soltos ou soluções desconectadas",
];

const POST_CALL_STEPS: string[] = [
  "Diagnóstico objetivo sobre canais, filas, equipe e indicadores combinados ao seu cenário.",
  "Oferta sintética: escopo técnico, treino, go-live assistido e acompanhamento.",
  "Implantação gerenciada com setup inicial e parametrização da operação.",
  "Treino para gestores e operadores conforme combinado.",
  "Ajustes nos primeiros dias e métricas para não “apagar incêndio” no escuro.",
];

const KEY_MESSAGES: string[] = [
  "Separe atendimento e prospecção sem perder o controle da operação.",
  "O operador conversa. O gestor acompanha. A DevFlow Labs sustenta a operação.",
  "A IA acelera o atendimento sem remover a governança humana.",
  "Cada canal pode ter objetivo, contexto e leitura gerencial própria.",
];

export function DemoGuidedExperience() {
  const heroTitleId = useId();
  const simSectionId = useId();
  const inputId = useId();
  const [phase, setPhase] = useState<Phase>("pick");
  const [scenario, setScenario] = useState<DemoScenarioId | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [ops, setOps] = useState<DemoOpsState>(() => getInitialOpsState("restaurante"));
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [handoffBanner, setHandoffBanner] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, phase, handoffBanner]);

  const resetDemo = useCallback(() => {
    if (queueTimerRef.current) {
      clearTimeout(queueTimerRef.current);
      queueTimerRef.current = null;
    }
    setPhase("pick");
    setScenario(null);
    setMessages([]);
    setOps(getInitialOpsState("restaurante"));
    setInput("");
    setIsTyping(false);
    setHandoffBanner(false);
    logDemo("demo_reset", {});
  }, []);

  const completeDemo = useCallback(() => {
    if (scenario) {
      trackDemoCompleted(scenario);
      logDemo("demo_completed", { scenario });
    }
    setPhase("success");
  }, [scenario]);

  const selectScenario = useCallback((id: DemoScenarioId) => {
    trackDemoScenarioSelected(id);
    logDemo("scenario_selected", { scenario: id });
    setScenario(id);
    setPhase("chat");
    setHandoffBanner(false);
    setOps(opsAfterScenarioSelect(id));
    setMessages([
      {
        id: nextId(),
        role: "bot",
        text: getScenarioIntro(id),
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    (raw: string, source: "chip" | "input") => {
      const trimmed = raw.trim();
      if (!trimmed || !scenario || phase !== "chat" || isTyping) return;

      trackDemoMessageSent(scenario, source);
      logDemo("message_sent", { scenario, source, length: trimmed.length });

      const userMsg: ChatMsg = { id: nextId(), role: "user", text: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      const opsAfterUser = buildOpsAfterUserMessage(scenario, trimmed, ops);
      setOps(opsAfterUser);
      setIsTyping(true);

      const delay = 1000 + Math.random() * 500;
      setTimeout(() => {
        const reply = resolveDemoUserMessage(scenario, trimmed, opsAfterUser);
        const isHandoff = reply.kind === "handoff";

        if (isHandoff) {
          trackDemoHandoff(scenario);
          logDemo("handoff", { scenario });
        }

        if (reply.opsPatch) {
          setOps((prev) => ({ ...prev, ...reply.opsPatch }));
        }

        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "bot",
            text: reply.botText,
            handoff: isHandoff,
          },
        ]);
        setIsTyping(false);

        if (isHandoff) {
          setHandoffBanner(true);
          if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
          queueTimerRef.current = setTimeout(() => {
            setOps((o) => applyHandoffQueueVisual(o));
            logDemo("handoff_queue_visual", { scenario });
            queueTimerRef.current = null;
          }, 900);
        }
      }, delay);
    },
    [scenario, phase, ops, isTyping]
  );

  const def = scenario ? DEMO_SCENARIOS[scenario] : null;

  return (
    <div className="df-page min-h-screen">
      <section
        className="border-b border-border bg-gradient-to-b from-primary/[0.08] via-background to-background py-12 sm:py-16 lg:py-20"
        aria-labelledby={heroTitleId}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className={cn(demoEyebrowClass, "mb-4")}>
            Diagnóstico operacional · WhatsApp multi-canal
          </div>
          <h1
            id={heroTitleId}
            className="max-w-3xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight"
          >
            Agende um diagnóstico da sua operação no WhatsApp
          </h1>
          <p className="df-text-secondary mt-4 max-w-3xl text-base leading-relaxed sm:text-lg">
            Entenda onde sua equipe perde velocidade, contexto e oportunidades — e veja como uma operação
            multi-canal pode separar atendimento, prospecção e gestão em um fluxo mais previsível.
          </p>
          <div className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <WhatsAppCta
              label="Agendar diagnóstico"
              ariaLabel="Agendar diagnóstico no WhatsApp com a DevFlow Labs"
              size="lg"
              text="Quero agendar um diagnóstico da minha operação no WhatsApp com a DevFlow Labs."
            />
            <Link
              href="/solucoes/whatsapp-multi-canal"
              className={demoCtaSecondaryClass}
              aria-label="Ver solução WhatsApp multi-canal da DevFlow Labs"
            >
              Ver solução multi-canal
            </Link>
          </div>
          <p className="df-text-secondary mt-6 max-w-2xl text-sm leading-relaxed">
            Leia a visão completa da oferta em{" "}
            <Link
              href="/solucoes/whatsapp-multi-canal"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              /solucoes/whatsapp-multi-canal
            </Link>
            . Modelo comercial típico: implantação gerenciada com setup inicial e mensalidade de acompanhamento —
            conversamos valores na call.
          </p>
        </div>
      </section>

      <section className={cn(demoSectionMutedClass, "py-14 sm:py-16")}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            O que avaliamos no diagnóstico
          </h2>
          <p className="df-text-secondary mt-3 max-w-2xl text-sm sm:text-base">
            Uma conversa consultiva para mapear hoje e desenhar o que muda com canais separados, visão gerencial e
            assistência disciplinada.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIAGNOSTIC_POINTS.map((item) => (
              <div key={item.title} className={demoCardClass()}>
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="df-text-secondary mt-2 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            O que você verá na demonstração
          </h2>
          <p className="df-text-secondary mt-3 max-w-2xl text-sm sm:text-base">
            Depois do diagnóstico alinhado, mostramos o fluxo real da plataforma — ou você pode encerrar aqui com a
            simulação guiada abaixo.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {DEMO_HIGHLIGHTS.map((line) => (
              <li
                key={line}
                className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm"
              >
                <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cn(demoSectionMutedClass, "py-14 sm:py-16")}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Para quem é</h2>
          <ul className="mt-8 space-y-3 text-sm sm:text-base">
            {AUDIENCE_POINTS.map((line) => (
              <li key={line} className="flex gap-3 text-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Depois da conversa: como seguimos
          </h2>
          <ol className="mt-8 list-decimal space-y-3 pl-5 text-sm text-foreground sm:text-base">
            {POST_CALL_STEPS.map((step) => (
              <li key={step} className="pl-1 leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="border-y border-border bg-primary/[0.04] py-10 sm:py-12">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Como trabalhamos</p>
          <ul className="mt-4 space-y-3">
            {KEY_MESSAGES.map((msg) => (
              <li
                key={msg}
                className="border-l-4 border-primary/40 pl-4 text-sm font-semibold leading-relaxed text-foreground sm:text-base"
              >
                {msg}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="py-8 sm:py-12 lg:py-16" aria-labelledby={simSectionId}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
              <h2
                id={simSectionId}
                className="mt-4 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                Demonstração guiada no simulador
              </h2>
              <p className="df-text-secondary mt-3 leading-relaxed">
                Simulação rápida: escolha um segmento, envie mensagens como cliente e veja triagem, assistência e
                handoff humano — o mesmo tipo de fluxo que orientamos em implantação gerenciada.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={resetDemo}
              aria-label="Reiniciar simulação do zero"
              className="df-surface inline-flex items-center gap-2 self-start rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-none transition-colors hover:bg-primary/10"
            >
              <RotateCcw className="size-4" aria-hidden />
              Reiniciar simulação
            </Button>
          </div>

          {phase === "success" ? (
            <div className="df-surface-elevated mx-auto mt-8 max-w-xl rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-6 text-center shadow-sm sm:mt-12 sm:p-8">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
              <h3 className="mt-4 text-balance text-xl font-semibold text-foreground">
                Próximo passo: levar este fluxo para sua operação
              </h3>
              <p className="df-text-secondary mt-2 text-sm leading-relaxed">
                Você já viu a dinâmica. Agende o diagnóstico para cruzar com seu volume, canais e equipe — e receber
                uma proposta alinhada à implantação gerenciada.
              </p>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
                <WhatsAppCta
                  label="Agendar diagnóstico"
                  ariaLabel="Agendar diagnóstico no WhatsApp após a simulação"
                  size="lg"
                  text="Vi a simulação e quero agendar um diagnóstico da minha operação no WhatsApp."
                />
                <Link
                  href="/solucoes/whatsapp-multi-canal"
                  aria-label="Ver solução WhatsApp multi-canal"
                  className="df-surface inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-primary/10"
                >
                  Ver solução multi-canal
                </Link>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={resetDemo}
                aria-label="Recomeçar a simulação guiada"
                className="df-text-secondary mt-8 h-auto min-h-0 px-0 py-0 text-xs font-normal underline-offset-4 shadow-none hover:text-foreground hover:underline"
              >
                Rodar a simulação de novo
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid min-w-0 gap-6 sm:mt-10 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <div className="min-w-0 space-y-6 sm:space-y-8">
                {phase === "pick" && (
                  <div>
                    <p className="df-text-secondary text-sm font-medium">
                      Escolha um cenário e simule como um cliente interage com seu WhatsApp.
                    </p>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">1. Escolha o segmento</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Três roteiros prontos — cada um com atalhos alinhados ao nicho.
                    </p>
                    <div className="mt-6">
                      <DemoScenarioPicker onSelect={selectScenario} disabled={isTyping} />
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    "df-surface-elevated min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-lg",
                    phase === "pick" && "opacity-90"
                  )}
                >
                  <div className="flex items-center gap-3 border-b border-border bg-primary/10 px-4 py-3">
                    <div className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                      <MessageCircle className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {def ? `${def.shortLabel} — assistente` : "WhatsApp (simulado)"}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-primary">
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                        {phase === "pick" ? "escolha um cenário" : "online — simulação guiada"}
                      </p>
                    </div>
                  </div>

                  {handoffBanner && phase === "chat" && (
                    <div
                      className="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                      role="status"
                      aria-live="polite"
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-100">
                        <UserRound className="size-5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold">Handoff humano ativo</p>
                        <p className="mt-0.5 text-amber-100/90">
                          O bot encerrou a automação neste ponto. Na operação real, a conversa aparece na fila / inbox
                          com histórico completo para o agente assumir.
                        </p>
                      </div>
                    </div>
                  )}

                  {phase === "pick" ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-center">
                      <Headphones className="size-10 text-muted-foreground/60" aria-hidden />
                      <p className="text-sm font-medium text-foreground">Escolha um cenário para começar</p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        Selecione restaurante, tabacaria ou loja/serviços para carregar o roteiro e as sugestões de
                        mensagem.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div
                        className="flex h-[min(20rem,52dvh)] min-h-0 flex-col overflow-x-hidden overflow-y-auto p-3 sm:h-80 sm:p-4"
                        role="log"
                        aria-live="polite"
                        aria-relevant="additions text"
                        aria-label="Mensagens da conversa simulada"
                      >
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn("mb-3 flex", msg.role === "user" ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[90%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                                msg.role === "user"
                                  ? "rounded-tr-md bg-primary text-primary-foreground"
                                  : "rounded-tl-md border df-border-brand bg-card/60 text-foreground",
                                msg.handoff &&
                                  "border-amber-500/35 bg-amber-500/10 text-amber-100 ring-1 ring-amber-500/25"
                              )}
                            >
                              <BubbleBody text={msg.text} />
                            </div>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="mb-3 flex justify-start" role="status" aria-live="polite">
                            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border df-border-brand bg-card/60 px-4 py-2">
                              <span
                                className="size-2 animate-pulse rounded-full bg-muted-foreground"
                                style={{ animationDelay: "0ms" }}
                              />
                              <span
                                className="size-2 animate-pulse rounded-full bg-muted-foreground"
                                style={{ animationDelay: "150ms" }}
                              />
                              <span
                                className="size-2 animate-pulse rounded-full bg-muted-foreground"
                                style={{ animationDelay: "300ms" }}
                              />
                              <span className="df-text-muted text-xs">Digitando…</span>
                            </div>
                          </div>
                        )}
                        <div ref={bottomRef} />
                      </div>

                      {def && scenario && (
                        <div className="border-t border-border px-3 py-2">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Atalhos do roteiro</p>
                          <div className="flex flex-wrap gap-2">
                            {chipSuggestionsForScenario(scenario).map((shortcut) => (
                              <Button
                                key={shortcut}
                                type="button"
                                variant="secondary"
                                disabled={isTyping}
                                aria-label={`Enviar sugestão: ${shortcut}`}
                                onClick={() => sendMessage(shortcut, "chip")}
                                className={cn(
                                  "df-surface h-auto min-h-0 justify-start rounded-lg border border-border bg-background px-3 py-1.5 text-left text-xs font-medium shadow-none",
                                  "text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5",
                                  isTyping && "opacity-50"
                                )}
                              >
                                {shortcut}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex min-w-0 gap-2 border-t border-border p-3">
                        <label htmlFor={inputId} className="sr-only">
                          Mensagem como cliente no WhatsApp
                        </label>
                        <input
                          id={inputId}
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendMessage(input, "input")}
                          placeholder="Digite como um cliente no WhatsApp…"
                          autoComplete="off"
                          disabled={isTyping}
                          className="df-surface min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 sm:px-4"
                        />
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => sendMessage(input, "input")}
                          disabled={isTyping || !input.trim()}
                          className="size-10 shrink-0 rounded-lg p-0 hover:bg-primary/90 disabled:opacity-50"
                          aria-label="Enviar mensagem"
                        >
                          <Send className="size-5" />
                        </Button>
                      </div>

                      <div className="border-t border-border bg-primary/5 px-3 py-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={completeDemo}
                          aria-label="Finalizar simulação e ver próximos passos"
                          className="df-surface w-full rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground shadow-none transition-colors hover:bg-primary/10"
                        >
                          Finalizar simulação
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <p className="df-text-secondary text-center text-sm leading-relaxed lg:text-left">
                  Exemplo interativo do fluxo de atendimento e operação — complementa o diagnóstico ao vivo na call.
                </p>
              </div>

              <div className="min-w-0 space-y-4">
                <h3 className="text-lg font-semibold text-foreground lg:sr-only">Painel operacional</h3>
                {scenario ? (
                  <DemoOpsPanel
                    variant="active"
                    scenarioLabel={def!.label}
                    threadPreview={ops.threadPreview}
                    status={ops.status}
                    queueHint={ops.queueHint}
                  />
                ) : (
                  <DemoOpsPanel variant="empty" />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-border bg-muted/25 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-balance text-xl font-bold text-foreground sm:text-2xl">
            Prefere falar com alguém da DevFlow antes do simulador?
          </h2>
          <p className="df-text-secondary mt-3 text-sm leading-relaxed sm:text-base">
            Agende o diagnóstico no WhatsApp ou leia primeiro a página da solução multi-canal — os dois caminhos
            conversam entre si.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
            <WhatsAppCta
              label="Agendar diagnóstico"
              ariaLabel="Falar com especialista da DevFlow Labs no WhatsApp"
              size="lg"
              text="Quero agendar um diagnóstico da operação no WhatsApp com a DevFlow Labs."
            />
            <Link
              href="/solucoes/whatsapp-multi-canal"
              className={cn(demoCtaSecondaryClass, "sm:min-h-12")}
              aria-label="Abrir página solução WhatsApp multi-canal"
            >
              Ver solução multi-canal
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center">
        <Link href="/" className="df-text-secondary text-sm hover:text-foreground" aria-label="Voltar à página inicial">
          ← Voltar ao início
        </Link>
      </footer>
    </div>
  );
}
