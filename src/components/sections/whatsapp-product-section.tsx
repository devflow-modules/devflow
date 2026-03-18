"use client";

import Link from "next/link";
import { MessageCircle, Check, ArrowRight, Zap, UserRound, BarChart3 } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "Automação 24/7",
    description: "Responde clientes a qualquer hora, sem intervenção humana para perguntas repetitivas.",
  },
  {
    icon: UserRound,
    title: "Handoff humano",
    description: "Quando o cliente precisa, transfere automaticamente para a equipe certa.",
  },
  {
    icon: BarChart3,
    title: "Métricas operacionais",
    description: "Dashboards com volume, tempo de resposta e performance em tempo real.",
  },
];

const highlights = [
  "WhatsApp Cloud API oficial",
  "Dedupe automático de mensagens",
  "Audit log com trace_id",
  "Infraestrutura escalável",
];

export function WhatsAppProductSection() {
  return (
    <section
      id="automacao-whatsapp"
      className="py-24 bg-[#f8fafc]"
      aria-labelledby="whatsapp-product-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Conteúdo esquerdo */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <MessageCircle className="size-3.5" aria-hidden />
              Um dos nossos produtos
            </div>

            <div>
              <h2
                id="whatsapp-product-heading"
                className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              >
                Atendimento automatizado e escalável no WhatsApp
              </h2>
              <p className="mt-3 text-slate-600">
                Empresas que recebem muitas mensagens perdem vendas todos os dias.
                A WhatsApp Platform automatiza respostas, organiza conversas e conecta
                com sua equipe quando necessário.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-4 text-primary" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{feature.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{feature.description}</p>
                </div>
              ))}
            </div>

            <ul className="grid grid-cols-2 gap-2" role="list">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-11 rounded-xl px-5 text-sm font-semibold",
                  "bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90"
                )}
              >
                Ver como funciona
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <WhatsAppCta
                label="Quero automatizar"
                size="sm"
                text="Olá, quero entender como funciona a automação de WhatsApp."
              />
            </div>
          </div>

          {/* Visual direito */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Dashboard — Hoje</p>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Live</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Mensagens", value: "1.247", color: "text-primary" },
                  { label: "Automáticas", value: "74%", color: "text-accent" },
                  { label: "Handoffs", value: "23", color: "text-orange-500" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-muted/40 p-3 text-center">
                    <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Últimas conversas</p>
                {[
                  { name: "Cliente A", status: "Resolvido pelo bot", time: "agora", dot: "bg-primary" },
                  { name: "Cliente B", status: "Em atendimento humano", time: "2min", dot: "bg-orange-400" },
                  { name: "Cliente C", status: "Aguardando resposta", time: "5min", dot: "bg-accent" },
                ].map((conv) => (
                  <div key={conv.name} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                    <span className={cn("size-2 shrink-0 rounded-full", conv.dot)} aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{conv.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{conv.status}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{conv.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-xs text-primary font-medium">
                Infraestrutura com assinatura Meta · Dedupe · AuditLog + trace_id
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
