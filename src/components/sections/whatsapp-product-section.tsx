"use client";

import Link from "next/link";
import { Check, ArrowRight, Zap, UserRound, BarChart3 } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
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
      className="bg-[#f1f5f9] py-12 sm:py-16 lg:py-20"
      aria-labelledby="whatsapp-product-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-sm font-medium text-slate-500 sm:text-left">
          O próximo passo, se atendimento é seu gargalo:
        </p>
        <div className="grid min-w-0 gap-8 lg:grid-cols-2 lg:gap-14 lg:items-center">
          <div className="space-y-8">
            <div>
              <h2
                id="whatsapp-product-heading"
                className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                WhatsApp que responde sozinho — e escala com você
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Cliente não espera: quem demora, perde pra quem responde na hora.
                <span className="mt-2 block text-base text-slate-700">
                  Você ganha tempo; o automático cobre o repetitivo.
                </span>
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                >
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12">
                    <feature.icon className="size-4 text-primary" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-bold text-foreground">{feature.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-2" role="list">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <div className="space-y-4">
              <WhatsAppCta
                label="Quero automatizar meu WhatsApp"
                ariaLabel="Quero automatizar meu WhatsApp: abrir conversa no WhatsApp"
                size="lg"
                text="Olá, quero automatizar o atendimento da minha empresa no WhatsApp."
              />
              <p className="text-xs text-slate-500">
                Conversa sem custo · Sem compromisso nessa etapa
              </p>
              <Link
                href="/demo"
                aria-label="Ver demonstração guiada de atendimento no WhatsApp"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Ver demo ao vivo
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border-2 border-border bg-white p-6 shadow-[0_12px_48px_rgba(0,0,0,0.06)]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Painel — hoje</p>
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
                  <div key={stat.label} className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className={cn("text-xl font-extrabold", stat.color)}>{stat.value}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Fila recente
                </p>
                {[
                  { name: "Cliente A", status: "Resolvido pelo bot", time: "agora", dot: "bg-primary" },
                  { name: "Cliente B", status: "Com atendente", time: "2 min", dot: "bg-orange-400" },
                  { name: "Cliente C", status: "Aguardando", time: "5 min", dot: "bg-sky-500" },
                ].map((conv) => (
                  <div
                    key={conv.name}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-slate-50/80 px-3 py-2.5"
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", conv.dot)} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{conv.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{conv.status}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
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
