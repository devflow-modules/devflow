"use client";

import Link from "next/link";
import { MessageCircle, Check, ArrowRight, Zap, UserRound, BarChart3, TrendingDown } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "Resposta na hora",
    description: "Cliente não espera: FAQ, status e links automáticos 24 horas por dia.",
  },
  {
    icon: UserRound,
    title: "Humano quando importa",
    description: "Pediu atendente? A conversa vai para sua equipe sem o cliente repetir tudo.",
  },
  {
    icon: BarChart3,
    title: "Você vê o que está acontecendo",
    description: "Volume, automação vs handoff — dados para decidir, não para decorar.",
  },
];

const highlights = [
  "WhatsApp Cloud API oficial (Meta)",
  "Sem mensagem duplicada (dedupe)",
  "Audit log com rastreio",
  "Escala com a sua operação",
];

export function WhatsAppProductSection() {
  return (
    <section
      id="automacao-whatsapp"
      className="py-20 sm:py-28 bg-[#f1f5f9]"
      aria-labelledby="whatsapp-product-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800">
              <TrendingDown className="size-3.5" aria-hidden />
              Cada minuto conta
            </div>

            <div>
              <h2
                id="whatsapp-product-heading"
                className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
              >
                Quantos clientes você já perdeu por não responder a tempo?
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Automatize seu WhatsApp, responda na hora e organize sua operação — sem parecer robô
                gelado.
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                Clientes não esperam resposta — eles falam com o próximo negócio.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
              <p className="text-sm font-semibold text-amber-950">
                Cada mensagem sem resposta é uma venda perdida. Cada cliente não respondido é dinheiro
                que não entra.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12">
                    <feature.icon className="size-4 text-primary" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-bold text-foreground">{feature.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>

            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-2" role="list">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <WhatsAppCta
                label="Quero automatizar meu WhatsApp"
                size="lg"
                text="Olá, quero automatizar o atendimento da minha empresa no WhatsApp."
              />
              <Link
                href="/demo"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-14 rounded-xl border-2 border-border px-6 text-base font-bold",
                  "bg-white transition-all hover:border-primary/30 hover:bg-slate-50"
                )}
              >
                Ver demo ao vivo
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="text-xs font-medium text-slate-600">
              Sem cartão pra conversar · Sem compromisso na conversa · Você decide o próximo passo
            </p>
            <p className="text-xs text-slate-500">
              Cada dia sem automatizar é tempo que seu concorrente usa pra te ultrapassar.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-border bg-white p-6 shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Painel — hoje</p>
                <span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-bold text-primary">
                  Ao vivo
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
              <div className="mt-5 space-y-2">
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
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center sm:text-left">
              <p className="text-xs font-semibold text-primary">
                Meta · API oficial · Pronto para produção
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
