"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Wallet, SplitSquareHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const microProof = [
  "Ferramentas prontas para uso",
  "WhatsApp automatizado",
  "Controle financeiro completo",
  "Dados em segundos",
];

function DashboardMockCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Sistema Financeiro</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2.5">
          <p className="text-[10px] text-muted-foreground">Receitas</p>
          <p className="text-sm font-bold text-primary">R$ 8.400</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5">
          <p className="text-[10px] text-muted-foreground">Despesas</p>
          <p className="text-sm font-bold text-destructive">R$ 3.250</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[61%] rounded-full bg-primary" />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">61% do orçamento utilizado</p>
    </div>
  );
}

function ChatMockCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
          <MessageCircle className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">DevFlow Bot</p>
          <p className="flex items-center gap-1 text-[10px] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            online
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="max-w-[85%] self-start rounded-2xl rounded-tl-md border border-border bg-muted/30 px-3 py-2 text-xs">
          Olá! Em que posso ajudar?
        </div>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-muted px-3 py-2 text-xs">
          Quero saber o status do pedido
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-border bg-muted/30 px-3 py-2 text-xs">
          Pedido #1042 — em rota de entrega ✓
        </div>
      </div>
    </div>
  );
}

function ToolMockCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-accent/10">
          <SplitSquareHorizontal className="size-4 text-accent" />
        </div>
        <p className="text-xs font-semibold text-foreground">Divisão de Contas</p>
      </div>
      <div className="space-y-1.5">
        {[
          { name: "Aluguel", value: "R$ 900" },
          { name: "Internet", value: "R$ 120" },
          { name: "Energia", value: "R$ 85" },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5">
            <span className="text-[11px] text-muted-foreground">{item.name}</span>
            <span className="text-[11px] font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-center">
        <p className="text-[10px] text-muted-foreground">Cada pessoa paga</p>
        <p className="text-sm font-bold text-primary">R$ 368,33</p>
      </div>
    </div>
  );
}

export function HeroV2() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 py-24"
      aria-labelledby="hero-heading"
    >
      {/* Background decorativo */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-35"
          style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.6) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Coluna esquerda */}
          <div className="space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-sm">
              <span className="text-primary">Ferramentas</span>
              <span className="text-slate-300">•</span>
              <span className="text-accent">Automação</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">SaaS</span>
            </div>

            <div className="space-y-4 max-w-[600px]">
              <h1
                id="hero-heading"
                className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              >
                Plataforma para automatizar, organizar e escalar sua operação
              </h1>
              <p className="text-base text-slate-600 sm:text-lg">
                Ferramentas, automações e sistemas para quem quer crescer com eficiência —
                do atendimento ao financeiro.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="#ferramentas"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-14 rounded-xl px-6 text-lg font-semibold",
                  "bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90"
                )}
              >
                Ver ferramentas
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/automacao-whatsapp"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-14 rounded-xl border border-border px-6 text-lg font-semibold",
                  "bg-white text-foreground transition-all duration-200 hover:bg-slate-50"
                )}
              >
                <MessageCircle className="size-5 text-primary" aria-hidden />
                Automação WhatsApp
              </Link>
            </div>

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="list">
              {microProof.map((bullet, i) => (
                <li key={i} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna direita — composição de 3 mocks */}
          <div className="relative">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="space-y-4">
                <DashboardMockCard />
                <ToolMockCard />
              </div>
              <div className="sm:pt-8 lg:pt-0 xl:pt-8">
                <ChatMockCard />
                <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
                  <p className="text-xs font-medium text-accent">Consulta CNPJ</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">CNPJ: 00.000.000/0001-00</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Situação: Ativa · Porte: ME</p>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-primary" />
                    <span className="text-[10px] text-primary font-medium">Dados retornados em &lt;1s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
