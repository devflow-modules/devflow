"use client";

import Link from "next/link";
import { Check, ArrowRight, MessageCircle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { trackCtaDemoClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const proofSocial = "Infraestrutura pronta para automação de atendimento • WhatsApp • IA • Operação humana";

const microProof = [
  "Automação 24/7",
  "Handoff humano",
  "Métricas operacionais",
  "Infraestrutura escalável",
];

const messages = [
  {
    type: "user" as const,
    text: "A entrega chega hoje?",
    time: "14:32",
  },
  {
    type: "bot" as const,
    text: "Temos motoboy até as 18h e app de delivery. Qual opção você prefere?",
    time: "14:32",
  },
  {
    type: "user" as const,
    text: "Prefiro falar com um atendente",
    time: "14:33",
  },
  {
    type: "bot" as const,
    text: "Conectando você com nossa equipe agora.",
    time: "14:33",
  },
];

const proofBadges = [
  "Assinatura Meta",
  "Dedupe por mensagem",
  "AuditLog + trace_id",
];

function MessageBubble({
  type,
  text,
  time,
}: {
  type: "user" | "bot";
  text: string;
  time: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 max-w-[85%]",
        type === "user" ? "self-end items-end" : "self-start items-start"
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-sm",
          type === "user"
            ? "rounded-tr-md bg-muted text-foreground"
            : "rounded-tl-md border border-border bg-card text-foreground"
        )}
      >
        {text}
      </div>
      <span className="text-[10px] text-muted-foreground">{time}</span>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-b from-card to-muted/40 py-24"
      aria-labelledby="hero-heading"
    >
      {/* Glow sutil + grid tecnológico */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
        >
          <div className="df-decor-radial-brand absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-35" />
          <div className="df-decor-radial-accent absolute -bottom-40 -left-40 h-80 w-80 rounded-full opacity-30" />
          <div className="df-decor-grid-mesh absolute inset-0 opacity-[0.04]" />
        </div>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Coluna esquerda */}
          <div className="space-y-6 sm:space-y-8">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-sm"
              )}
            >
              <span className="text-primary">Automação</span>
              <span className="df-text-muted">•</span>
              <span className="text-accent">SaaS</span>
              <span className="df-text-muted">•</span>
              <span className="df-text-secondary">Operação real</span>
            </div>

            <div className="space-y-4 max-w-[600px]">
              <h1
                id="hero-heading"
                className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
              >
                Automação Inteligente de Atendimento no WhatsApp
              </h1>
              <p className="text-base df-text-secondary sm:text-lg">
                Empresas que recebem muitas mensagens perdem vendas todos os dias.
                Automatize respostas, organize conversas e nunca deixe um cliente
                sem retorno.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground">
                  Atendimento automático
                </span>
                <span className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground">
                  Qualificação de leads
                </span>
                <span className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground">
                  Integração WhatsApp Cloud API
                </span>
              </div>
            </div>

            <p className="text-xs font-medium df-text-muted">
              {proofSocial}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/demo"
                onClick={() => trackCtaDemoClick("hero")}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-14 rounded-xl px-6 text-lg font-semibold",
                  "bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90"
                )}
              >
                Ver uma conversa em ação
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <WhatsAppCta
                label="Quero automatizar meu atendimento"
                size="lg"
                text="Olá, quero entender como funciona a automação."
              />
            </div>

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="list">
              {microProof.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm font-medium df-text-secondary"
                >
                  <Check
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna direita - mockup conversa realista */}
          <div
            className={cn(
              "rounded-xl border border-[#cbd5e1] bg-gradient-to-b from-card to-muted/40/80 p-4",
              "shadow-[0_20px_60px_rgba(0,0,0,0.1)] transition-all duration-200 sm:p-5 lg:p-6"
            )}
          >
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Exemplo real de conversa
            </p>
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
                <MessageCircle className="size-6 text-primary" />
                <span
                  className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-primary"
                  title="Online"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">DevFlow Bot</p>
                <p className="flex items-center gap-1.5 text-xs text-primary">
                  <span className="size-1.5 rounded-full bg-primary" />
                  online
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  type={msg.type}
                  text={msg.text}
                  time={msg.time}
                />
              ))}
              <div className="flex items-center gap-2 text-xs df-text-muted">
                <span className="flex gap-1">
                  <span className="size-2 animate-pulse rounded-full bg-muted-foreground/35" style={{ animationDelay: "0ms" }} />
                  <span className="size-2 animate-pulse rounded-full bg-muted-foreground/35" style={{ animationDelay: "150ms" }} />
                  <span className="size-2 animate-pulse rounded-full bg-muted-foreground/35" style={{ animationDelay: "300ms" }} />
                </span>
                DevFlow Bot está digitando...
              </div>
            </div>
          </div>
        </div>

        {/* Micro-cards de prova técnica — azul tech para identidade */}
        <div className="mt-12 flex flex-wrap justify-center gap-3 sm:justify-start lg:mt-16">
          {proofBadges.map((badge) => (
            <div
              key={badge}
              className={cn(
                "rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-xs font-medium df-text-secondary"
              )}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
