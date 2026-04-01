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
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="py-14 sm:py-20" aria-labelledby={titleId}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
              <h1 id={titleId} className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Demonstração comercial — WhatsApp
              </h1>
              <p className="mt-3 text-slate-600">
                Fluxo guiado por segmento: captação no canal, resposta imediata, triagem automática e handoff explícito
                para humano. Tudo roda no seu navegador — sem depender de APIs externas nesta página.
              </p>
            </div>
            <button
              type="button"
              onClick={resetDemo}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <RotateCcw className="size-4" aria-hidden />
              Reiniciar demo
            </button>
          </div>

          {phase === "success" ? (
            <div className="mx-auto mt-14 max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50/80 p-8 text-center shadow-sm">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold text-emerald-950">Roteiro concluído</h2>
              <p className="mt-2 text-sm text-emerald-900/90">
                Você viu captação, automação de primeira resposta, triagem e handoff com fila — o mesmo raciocínio da
                plataforma em produção.
              </p>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
                <WhatsAppCta
                  label="Falar com a equipe"
                  size="lg"
                  text="Concluí a demo guiada do WhatsApp e quero entender encaixe no meu negócio."
                />
                <Link
                  href="/produtos/whatsapp-platform"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-emerald-100/50"
                >
                  Ver produto
                </Link>
              </div>
              <button
                type="button"
                onClick={resetDemo}
                className="mt-6 text-sm font-medium text-emerald-800 underline-offset-4 hover:underline"
              >
                Ver a demo de novo
              </button>
            </div>
          ) : (
            <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <div className="space-y-8">
                {phase === "pick" && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">1. Escolha o segmento</h2>
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
                    "overflow-hidden rounded-xl border border-border bg-card shadow-lg",
                    phase === "pick" && "opacity-90"
                  )}
                >
                  <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
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
                      className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                      role="status"
                      aria-live="polite"
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                        <UserRound className="size-5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold">Handoff humano ativo</p>
                        <p className="mt-0.5 text-amber-900/90">
                          O bot encerrou a automação neste ponto. Na operação real, a conversa aparece na fila / inbox
                          com histórico completo para o agente assumir.
                        </p>
                      </div>
                    </div>
                  )}

                  {phase === "pick" ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-center">
                      <Headphones className="size-10 text-muted-foreground/60" aria-hidden />
                      <p className="text-sm font-medium text-foreground">Chat aguardando cenário</p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        Selecione restaurante, tabacaria ou loja/serviços para carregar o roteiro e as sugestões de
                        mensagem.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-80 flex-col overflow-y-auto p-4">
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
                                  : "rounded-tl-md border bg-muted/50 text-foreground",
                                msg.handoff &&
                                  "border-amber-300 bg-amber-50/90 text-amber-950 ring-1 ring-amber-200/80"
                              )}
                            >
                              <BubbleBody text={msg.text} />
                            </div>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="mb-3 flex justify-start" role="status" aria-live="polite">
                            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-muted/50 px-4 py-2">
                              <span
                                className="size-2 animate-pulse rounded-full bg-slate-400"
                                style={{ animationDelay: "0ms" }}
                              />
                              <span
                                className="size-2 animate-pulse rounded-full bg-slate-400"
                                style={{ animationDelay: "150ms" }}
                              />
                              <span
                                className="size-2 animate-pulse rounded-full bg-slate-400"
                                style={{ animationDelay: "300ms" }}
                              />
                              <span className="text-xs text-slate-500">Digitando…</span>
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
                                onClick={() => sendMessage(prompt, "chip")}
                                className={cn(
                                  "rounded-lg border border-border bg-background px-3 py-1.5 text-left text-xs font-medium",
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

                      <div className="flex gap-2 border-t border-border p-3">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendMessage(input, "input")}
                          placeholder="Digite como se fosse o cliente no WhatsApp…"
                          disabled={isTyping}
                          className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => sendMessage(input, "input")}
                          disabled={isTyping || !input.trim()}
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-[#16a34a] disabled:opacity-50"
                          aria-label="Enviar"
                        >
                          <Send className="size-5" />
                        </button>
                      </div>

                      <div className="border-t border-border bg-muted/20 px-3 py-3">
                        <button
                          type="button"
                          onClick={completeDemo}
                          className="w-full rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Concluir roteiro da demonstração
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-center text-sm text-slate-600 lg:text-left">
                  Simulação local para apresentações. Contratos de webhook e multi-tenant da plataforma não são alterados
                  por esta página.
                </p>
              </div>

              <div className="space-y-4">
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
            <div className="mx-auto mt-12 max-w-2xl text-center">
              <p className="text-sm font-medium text-foreground">Pronto para levar isso para o seu WhatsApp?</p>
              <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <WhatsAppCta
                  label="Testar no WhatsApp"
                  size="lg"
                  text="Vi a demonstração guiada e quero automatizar meu negócio."
                />
                <Link
                  href="/automacao-whatsapp"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Ver automação
                </Link>
              </div>
            </div>
          )}

          <p className="mt-10 text-center">
            <Link href="/" className="text-sm text-slate-600 hover:text-foreground">
              ← Voltar ao início
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
