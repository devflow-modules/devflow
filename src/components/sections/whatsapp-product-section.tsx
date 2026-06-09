"use client";

import Link from "next/link";
import { Check, ArrowRight, Zap, UserRound, BarChart3 } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import {
  ENTENDER_APLICAR_NEGOCIO_CTA_LABEL,
  PLATFORM_IN_ACTION_CTA_LABEL,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "Resposta na hora",
    description: "FAQ, status, links — 24h sem você no celular.",
  },
  {
    icon: UserRound,
    title: "Humano quando precisa",
    description: "Cliente pede gente? A conversa vai pra equipe.",
  },
  {
    icon: BarChart3,
    title: "Números na mesa",
    description: "Volume, bot vs humano — pra decidir, não pra decorar.",
  },
];

const highlights = [
  "API oficial Meta",
  "Sem mensagem duplicada",
  "Auditoria rastreável",
  "Escala com a operação",
];

export function WhatsAppProductSection() {
  return (
    <section
      id="automacao-whatsapp"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-12 sm:py-16 lg:py-20"
      aria-labelledby="whatsapp-product-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <p className="df-text-secondary mb-6 text-center text-sm font-medium sm:text-left">
          Solução principal da DevFlow Labs:
        </p>
        <div className="grid min-w-0 gap-8 lg:grid-cols-2 lg:gap-14 lg:items-center">
          <div className="space-y-8">
            <div>
              <h2
                id="whatsapp-product-heading"
                className="df-text-primary text-3xl font-bold tracking-tight sm:text-4xl"
              >
                WhatsApp Platform — operação previsível de atendimento e vendas
              </h2>
              <p className="df-text-secondary mt-4 text-lg leading-relaxed">
                Mais resposta no tempo certo, com IA no repetitivo e handoff humano quando importa.
                <span className="df-text-primary mt-2 block text-base font-medium">
                  WhatsApp Cloud API oficial, sem número espelhado — fila, SLA e dashboard operacional.
                </span>
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="df-surface-elevated rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12">
                    <feature.icon className="size-4 text-primary" aria-hidden />
                  </div>
                  <p className="df-text-primary mt-3 text-sm font-bold">{feature.title}</p>
                  <p className="df-text-secondary mt-2 text-xs leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-2" role="list">
              {highlights.map((item) => (
                <li key={item} className="df-text-secondary flex items-center gap-2 text-sm">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <div className="space-y-4">
              <Link
                href="/produtos/whatsapp-platform"
                aria-label="Ver página da WhatsApp Platform com detalhes do produto"
                className={cn(
                  "df-btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
                  "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] sm:w-auto"
                )}
              >
                {PLATFORM_IN_ACTION_CTA_LABEL}
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
              <WhatsAppCta
                label={ENTENDER_APLICAR_NEGOCIO_CTA_LABEL}
                ariaLabel="Entender como aplicar no meu negócio: abrir conversa no WhatsApp"
                variant="secondary"
                size="lg"
                className="w-full justify-center sm:w-auto"
                text="Olá, quero entender como aplicar a WhatsApp Platform da DevFlow no meu negócio."
              />
              <p className="df-text-muted text-xs leading-relaxed">
                Demo guiada em seguida — sem compromisso nesta etapa.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="df-surface-elevated rounded-2xl border-2 p-6 shadow-[0_12px_48px_rgba(0,0,0,0.25)]">
              <div className="mb-4 flex items-center justify-between">
                <p className="df-text-primary text-sm font-bold">Painel — hoje</p>
                <span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-bold text-primary">
                  Produção
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Mensagens", value: "1.247", color: "text-primary" },
                  { label: "No bot", value: "74%", color: "text-sky-600" },
                  { label: "Humanos", value: "23", color: "text-orange-600" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-muted/30 p-3 text-center">
                    <p className={cn("text-xl font-extrabold", stat.color)}>{stat.value}</p>
                    <p className="df-text-secondary mt-0.5 text-[10px] font-medium">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                <p className="df-text-secondary text-xs font-bold uppercase tracking-wide">
                  Fila recente
                </p>
                {[
                  { name: "Cliente A", status: "Resolvido pelo bot", time: "agora", dot: "bg-primary" },
                  { name: "Cliente B", status: "Com atendente", time: "2 min", dot: "bg-orange-400" },
                  { name: "Cliente C", status: "Aguardando", time: "5 min", dot: "bg-sky-500" },
                ].map((conv) => (
                  <div
                    key={conv.name}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5"
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", conv.dot)} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="df-text-primary truncate text-xs font-semibold">{conv.name}</p>
                      <p className="df-text-secondary truncate text-[10px]">{conv.status}</p>
                    </div>
                    <span className="df-text-muted shrink-0 text-[10px] font-medium">
                      {conv.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold text-primary">
                Sistema em produção com automações reais — API Meta, fila, handoff.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
