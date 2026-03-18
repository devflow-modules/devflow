"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Wallet, SplitSquareHorizontal, Check } from "lucide-react";
import { trackHomeCta } from "@/lib/analytics";
import { PRIMARY_CONVERT_CTA_LABEL, PRODUCT_LIVE_HINT } from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const bullets = [
  "WhatsApp atendendo enquanto você foca no que importa",
  "Grana e contas num só lugar — sem planilha solta",
  "Ferramentas prontas: abriu, usou",
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">Sistema Financeiro</span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-lg bg-muted/50 p-2.5">
          <p className="text-[10px] text-muted-foreground">Receitas</p>
          <p className="text-sm font-bold text-primary">R$ 8.400</p>
        </div>
        <div className="min-w-0 rounded-lg bg-muted/50 p-2.5">
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
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <MessageCircle className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">DevFlow Bot</p>
          <p className="flex items-center gap-1 text-[10px] text-primary">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            online
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-border bg-muted/30 px-3 py-2 text-xs">
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
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
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
          <div key={item.name} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5">
            <span className="truncate text-[11px] text-muted-foreground">{item.name}</span>
            <span className="shrink-0 text-[11px] font-semibold text-foreground">{item.value}</span>
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

function CnpjMiniCard() {
  return (
    <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 shadow-sm">
      <p className="text-xs font-semibold text-accent">Consulta CNPJ</p>
      <p className="mt-1 break-all text-sm font-semibold text-foreground sm:break-normal">CNPJ: 00.000.000/0001-00</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Situação: Ativa · Porte: ME</p>
      <div className="mt-2 flex items-center gap-1">
        <span className="size-2 shrink-0 rounded-full bg-primary" />
        <span className="text-[10px] font-semibold text-primary">Resposta em &lt;1s</span>
      </div>
    </div>
  );
}

export function HeroV2() {
  return (
    <section
      id="hero"
      className="relative overflow-x-clip overflow-y-visible bg-gradient-to-b from-white via-white to-slate-50 py-14 sm:py-20 lg:py-28"
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-40 max-lg:opacity-25"
          style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.14) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full opacity-30 max-lg:opacity-20"
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

      <div className="mx-auto max-w-[1200px] px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div className="min-w-0 space-y-4 sm:space-y-6 lg:space-y-7">
            <div className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-primary/35 bg-primary/8 px-2.5 py-1.5 text-[11px] font-semibold shadow-sm min-[380px]:gap-2 min-[380px]:px-3 min-[380px]:text-xs sm:text-xs">
              <span className="size-2 shrink-0 rounded-full bg-primary ring-2 ring-primary/30" aria-hidden />
              <Wallet className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="text-primary">Ao vivo</span>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span className="w-full text-slate-700 sm:w-auto sm:truncate">
                <span className="sm:hidden">Ferramentas, WhatsApp e SaaS</span>
                <span className="hidden sm:inline">Ferramentas · WhatsApp · SaaS</span>
              </span>
            </div>

            <div className="max-w-[600px] space-y-3 sm:space-y-4">
              <h1
                id="hero-heading"
                className="text-balance text-[1.5rem] font-extrabold leading-[1.15] tracking-tight text-foreground min-[360px]:text-[1.625rem] min-[400px]:text-[1.75rem] sm:text-4xl sm:leading-[1.1] lg:text-[3.15rem]"
              >
                Ferramentas soltas custam tempo todo dia
              </h1>
              <p className="text-base leading-relaxed text-slate-600 sm:text-lg lg:text-xl">
                <strong className="font-semibold text-foreground">Um só lugar</strong> pra atendimento,
                finanças e tarefas.{" "}
                <span className="text-foreground/90">Ganhe tempo — pare de depender só do manual.</span>
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-2.5 sm:gap-2.5" role="list">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm font-medium text-slate-800 sm:gap-3 sm:text-base">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/12">
                    <Check className="size-3.5 text-primary" aria-hidden />
                  </span>
                  <span className="min-w-0 leading-snug">{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-3 pt-0.5 sm:pt-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-4">
                <Link
                  href="/ferramentas"
                  onClick={() => trackHomeCta("hero_tools")}
                  className={cn(
                    "devflow-cta-elite inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl px-4 text-left text-sm font-bold leading-snug sm:min-h-14 sm:w-auto sm:min-w-[min(100%,280px)] sm:justify-center sm:px-6 sm:text-base md:px-8 md:text-lg",
                    "bg-primary text-primary-foreground",
                    "transition-transform duration-200 ease-out",
                    "hover:scale-[1.02] hover:bg-[#16a34a] active:scale-[0.98] sm:hover:scale-[1.03]"
                  )}
                >
                  <span className="text-balance">{PRIMARY_CONVERT_CTA_LABEL}</span>
                  <ArrowRight className="size-5 shrink-0" aria-hidden />
                </Link>
                <Link
                  href="/#como-funciona-hub"
                  onClick={() => trackHomeCta("hero_how_it_works")}
                  className={cn(
                    "inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-slate-200 px-5 text-sm font-semibold sm:w-auto sm:min-w-[140px]",
                    "bg-white text-slate-700 transition-all duration-200",
                    "hover:border-primary/30 hover:bg-slate-50"
                  )}
                >
                  Como funciona
                </Link>
              </div>
              <p className="text-center text-[11px] font-medium leading-snug text-slate-500 sm:text-left sm:text-xs">
                {PRODUCT_LIVE_HINT}
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4 text-[11px] font-medium text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 sm:pt-5 sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {proofUsers} usuários ativos
              </span>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span>{proofOps} operações feitas</span>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span className="font-semibold text-emerald-700">Atualizado sempre</span>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
              Sem cartão · Cancele quando quiser · Direto no navegador
            </p>
          </div>

          {/* Mobile / tablet: uma composição forte */}
          <div className="mx-auto w-full max-w-md space-y-3 lg:hidden">
            <ChatMockCard />
            <CnpjMiniCard />
          </div>

          {/* Desktop: grid completo */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                <DashboardMockCard />
                <ToolMockCard />
              </div>
              <div className="xl:pt-6">
                <ChatMockCard />
                <div className="mt-4">
                  <CnpjMiniCard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
