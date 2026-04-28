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
import { DemoOpsPanel } from "./DemoOpsPanel";
import { DemoScenarioPicker } from "./DemoScenarioPicker";

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

function opsAfterScenarioSelect(scenario: DemoScenarioId): DemoOpsState {
  const s = DEMO_SCENARIOS[scenario];
  return {
    ...getInitialOpsState(scenario),
    threadPreview: `Canal aberto — ${s.shortLabel} (simulação)`,
    queueHint: "Aguardando a primeira mensagem do cliente",
  };
}

export function DemoGuidedExperience() {
  const titleId = useId();
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
      <section className="py-8 sm:py-12 lg:py-16" aria-labelledby={titleId}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
              <h1 id={titleId} className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Veja como seu WhatsApp pode responder, qualificar e organizar atendimento automaticamente
              </h1>
              <p className="df-text-muted mt-3">
                Simulação guiada: entrada de mensagem, resposta automática, triagem e handoff para humano — como
                acontece na operação real.
              </p>
            </div>
            <button
              type="button"
              onClick={resetDemo}
              aria-label="Reiniciar demonstração do zero"
              className="df-surface inline-flex items-center gap-2 self-start rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-primary/10"
            >
              <RotateCcw className="size-4" aria-hidden />
              Reiniciar demo
            </button>
          </div>

          {phase === "success" ? (
            <div className="df-surface-elevated mx-auto mt-8 max-w-xl rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-6 text-center shadow-sm sm:mt-12 sm:p-8">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
              <h2 className="mt-4 text-balance text-xl font-semibold text-foreground">
                Agora imagine isso rodando no seu WhatsApp
              </h2>
              <p className="df-text-muted mt-2 text-sm">
                Esse fluxo mostra como organizar atendimento, responder mais rápido e não perder oportunidades.
              </p>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
                <WhatsAppCta
                  label="Falar com especialista"
                  ariaLabel="Falar com especialista no WhatsApp após ver a demonstração"
                  size="lg"
                  text="Vi a demonstração e quero aplicar isso no meu WhatsApp."
                />
                <Link
                  href="/produtos/whatsapp-platform"
                  aria-label="Ver página completa do produto WhatsApp Platform"
                  className="df-surface inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-primary/10"
                >
                  Ver produto completo
                </Link>
              </div>
              <button
                type="button"
                onClick={resetDemo}
                aria-label="Recomeçar a demonstração guiada"
                className="df-text-muted mt-8 text-xs font-normal underline-offset-4 hover:text-foreground hover:underline"
              >
                Ver a demo de novo
              </button>
            </div>
          ) : (
            <div className="mt-8 grid min-w-0 gap-6 sm:mt-10 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <div className="min-w-0 space-y-6 sm:space-y-8">
                {phase === "pick" && (
                  <div>
                    <p className="df-text-muted text-sm font-medium">
                      Escolha um cenário e simule como um cliente interage com seu WhatsApp.
                    </p>
                    <h2 className="mt-3 text-lg font-semibold text-foreground">1. Escolha o segmento</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Três roteiros prontos para apresentação — cada um com atalhos alinhados ao nicho.
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
                        {phase === "pick" ? "escolha um cenário" : "online — demo guiada"}
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
                        className="flex min-h-0 h-[min(20rem,52dvh)] flex-col overflow-y-auto overflow-x-hidden p-3 sm:h-80 sm:p-4"
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

                      {def && (
                        <div className="border-t border-border px-3 py-2">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Atalhos do roteiro</p>
                          <div className="flex flex-wrap gap-2">
                            {def.suggestedPrompts.map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                disabled={isTyping}
                                aria-label={`Enviar sugestão: ${prompt}`}
                                onClick={() => sendMessage(prompt, "chip")}
                                className={cn(
                                  "df-surface rounded-lg border border-border bg-background px-3 py-1.5 text-left text-xs font-medium",
                                  "text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5",
                                  isTyping && "pointer-events-none opacity-50"
                                )}
                              >
                                {prompt}
                              </button>
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
                        <button
                          type="button"
                          onClick={() => sendMessage(input, "input")}
                          disabled={isTyping || !input.trim()}
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-[#00A86B] disabled:opacity-50"
                          aria-label="Enviar mensagem"
                        >
                          <Send className="size-5" />
                        </button>
                      </div>

                      <div className="border-t border-border bg-primary/5 px-3 py-3">
                        <button
                          type="button"
                          onClick={completeDemo}
                          aria-label="Finalizar demonstração e ver próximos passos"
                          className="df-surface w-full rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
                        >
                          Finalizar demonstração
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <p className="df-text-muted text-center text-sm lg:text-left">
                  Exemplo interativo do fluxo de atendimento e operação no WhatsApp.
                </p>
              </div>

              <div className="min-w-0 space-y-4">
                <h2 className="text-lg font-semibold text-foreground lg:sr-only">Painel operacional</h2>
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

          {phase !== "success" && (
            <div className="mx-auto mt-8 max-w-2xl px-1 text-center sm:mt-10">
              <p className="text-sm font-medium text-foreground">Pronto para levar isso para o seu WhatsApp?</p>
              <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                <WhatsAppCta
                  label="Falar com especialista"
                  ariaLabel="Falar com especialista no WhatsApp"
                  size="lg"
                  text="Vi a demonstração e quero aplicar isso no meu WhatsApp."
                />
                <Link
                  href="/produtos/whatsapp-platform"
                  aria-label="Ver página do produto WhatsApp Platform"
                  className="df-surface inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-primary/10 sm:w-auto"
                >
                  Ver produto
                </Link>
              </div>
            </div>
          )}

          <p className="mt-8 text-center sm:mt-10">
            <Link href="/" className="df-text-muted text-sm hover:text-foreground" aria-label="Voltar à página inicial">
              ← Voltar ao início
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
