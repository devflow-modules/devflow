"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Wallet, SplitSquareHorizontal, Check } from "lucide-react";
import { trackHomeCta } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const bullets = [
  "Responda clientes automaticamente no WhatsApp",
  "Controle seu financeiro sem planilhas",
  "Use ferramentas prontas em segundos",
];

function withPlus(n: string): string {
  const t = n.trim();
  return t.startsWith("+") ? t : `+${t}`;
}
const proofUsers = withPlus(
  (typeof process.env.NEXT_PUBLIC_PROOF_USERS === "string" && process.env.NEXT_PUBLIC_PROOF_USERS) ||
    "2.000+"
);
const proofOps = withPlus(
  (typeof process.env.NEXT_PUBLIC_PROOF_OPS === "string" && process.env.NEXT_PUBLIC_PROOF_OPS) ||
    "500 mil"
);

function DashboardMockCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(0,0,0,0.07)] transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
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
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(0,0,0,0.07)] transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
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
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(0,0,0,0.07)] transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
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
      className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50 py-20 sm:py-28"
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.14) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.5) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div className="space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/8 px-3 py-1.5 text-xs font-semibold shadow-sm">
              <Wallet className="size-3.5 text-primary" aria-hidden />
              <span className="text-primary">Ferramentas grátis</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-700">WhatsApp · SaaS</span>
            </div>

            <div className="max-w-[600px] space-y-4">
              <h1
                id="hero-heading"
                className="text-[2rem] font-extrabold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-[3.15rem]"
              >
                Você está perdendo tempo e dinheiro com ferramentas desconectadas
              </h1>
              <p className="text-lg leading-relaxed text-slate-600 sm:text-xl">
                Automatize atendimento, organize sua operação e use ferramentas prontas —{" "}
                <strong className="font-semibold text-foreground">tudo em um único lugar.</strong>
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-3 sm:gap-2.5" role="list">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-800 sm:text-base">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/12">
                    <Check className="size-3.5 text-primary" aria-hidden />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
              <Link
                href="/ferramentas"
                onClick={() => trackHomeCta("hero_tools")}
                className={cn(
                  "inline-flex items-center justify-center gap-2 min-h-[3.25rem] rounded-xl px-7 text-base font-bold",
                  "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(34,197,94,0.35)]",
                  "transition-all duration-200 hover:bg-[#16a34a] hover:shadow-[0_6px_20px_rgba(34,197,94,0.4)] hover:-translate-y-0.5"
                )}
              >
                Começar agora (leva menos de 1 min)
                <ArrowRight className="size-5 shrink-0" aria-hidden />
              </Link>
              <Link
                href="/#como-funciona-hub"
                onClick={() => trackHomeCta("hero_how_it_works")}
                className={cn(
                  "inline-flex items-center justify-center gap-2 min-h-[3.25rem] rounded-xl border-2 border-slate-200 px-5 text-base font-bold sm:px-7",
                  "bg-white text-foreground shadow-sm transition-all duration-200",
                  "hover:border-primary/40 hover:bg-slate-50 hover:shadow-md"
                )}
              >
                Ver como funciona
              </Link>
            </div>

            <p className="max-w-xl text-sm font-semibold leading-snug text-slate-800">
              Enquanto você não automatiza, você perde clientes todos os dias.
            </p>
            <p className="text-xs font-medium text-amber-800/90">
              Cada dia sem automatizar é tempo perdido.
            </p>

            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-4 text-xs font-semibold text-slate-600 sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                {proofUsers} usuários ativos
              </span>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span>{proofOps} operações realizadas</span>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span className="text-primary">Sistema em produção</span>
            </p>

            <p className="text-sm font-medium text-slate-600">
              Sem cartão · Sem compromisso · Você pode parar quando quiser
            </p>
            <p className="text-xs text-slate-500">
              Sem instalação · Funciona direto no navegador
            </p>
          </div>

          <div className="relative">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="space-y-4">
                <DashboardMockCard />
                <ToolMockCard />
              </div>
              <div className="sm:pt-6 lg:pt-0 xl:pt-6">
                <ChatMockCard />
                <div className="mt-4 rounded-xl border border-accent/25 bg-accent/5 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-accent">Consulta CNPJ</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">CNPJ: 00.000.000/0001-00</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Situação: Ativa · Porte: ME</p>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-semibold text-primary">Resposta em &lt;1s</span>
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
