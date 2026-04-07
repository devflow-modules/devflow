"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TenantSnapshot } from "@/lib/tenant-session";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MetricsSection } from "@/app/dashboard/MetricsSection";

type Overview = {
  totalMessages: number;
  automaticMessages: number;
  humanMessages: number;
  avgResponseTimeMs: number;
};

function CheckRow({
  done,
  title,
  detail,
  href,
  cta,
}: {
  done: boolean;
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100/90 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3.5">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            done ? "bg-emerald-500 text-white shadow-sm" : "bg-amber-100 text-amber-900"
          }`}
          aria-hidden
        >
          {done ? "✓" : "!"}
        </span>
        <div>
          <p className="font-semibold tracking-tight text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{detail}</p>
        </div>
      </div>
      <Link
        href={href}
        className="shrink-0 text-sm font-medium text-[var(--df-brand-700)] transition hover:text-[var(--df-brand-800)] sm:text-right"
      >
        {cta} →
      </Link>
    </div>
  );
}

export function DashboardClient({ snapshot }: { snapshot: TenantSnapshot }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(() => snapshot.authenticated);

  useEffect(() => {
    if (!snapshot.authenticated) return;
    fetch("/api/metrics/overview", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.overview) setOverview(data.overview);
      })
      .finally(() => setMetricsLoading(false));
  }, [snapshot.authenticated]);

  if (!snapshot.authenticated) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Acesso"
          title="Entre para continuar"
          description="O painel mostra o estado da conta, métricas e o próximo passo — só depois de iniciar sessão. Use o e-mail e palavra-passe da sua organização."
          layout="split"
          showDivider
          actions={
            <Link href="/login" className={`${buttonClassName("primary")} inline-flex px-6 py-3 text-base`}>
              Iniciar sessão
            </Link>
          }
        />
      </div>
    );
  }

  const setupComplete = snapshot.phoneConnected && snapshot.promptReady && snapshot.apiKeyReady;
  const hasActivity =
    overview !== null && (overview.totalMessages > 0 || (overview.automaticMessages ?? 0) + (overview.humanMessages ?? 0) > 0);

  const automationRate =
    overview && overview.totalMessages > 0
      ? Math.round((overview.automaticMessages / overview.totalMessages) * 100)
      : 0;

  const firstIncompleteHref = !snapshot.phoneConnected
    ? "/onboarding"
    : !snapshot.promptReady
      ? "/onboarding"
      : "/onboarding";

  return (
    <div className="space-y-12">
      {!setupComplete && (
        <PageHeader
          eyebrow="Configuração"
          eyebrowTone="amber"
          title="Conclua a configuração"
          description="WhatsApp, instruções da IA e chave de API. Depois, as mensagens aparecem na Inbox."
          layout="split"
          showDivider={false}
          className="!pb-0"
          actions={
            <Link href={firstIncompleteHref} className={`${buttonClassName("primary")} inline-flex px-6 py-3 text-base`}>
              Continuar
            </Link>
          }
        />
      )}

      {setupComplete && !hasActivity && !metricsLoading && (
        <PageHeader
          eyebrow="Pronto"
          title="Envie uma mensagem de teste"
          description="Conta pronta. Escreva para o número Business para validar o fluxo."
          layout="split"
          showDivider={false}
          className="!pb-0"
          actions={
            <Link href="/inbox" className={`${buttonClassName("primary")} inline-flex px-6 py-3 text-base`}>
              Abrir Inbox
            </Link>
          }
        />
      )}

      {setupComplete && (hasActivity || metricsLoading) && (
        <PageHeader
          eyebrow="Resumo"
          eyebrowTone="neutral"
          title="Atendimento"
          description={
            snapshot.tenantName ? (
              <>
                Conta <span className="font-medium text-slate-700">{snapshot.tenantName}</span> — volume, resposta e automação.
              </>
            ) : (
              "Volume de mensagens, tempo de resposta e automação."
            )
          }
          layout="split"
          showDivider
          actions={
            <Link href="/inbox" className={`${buttonClassName("primary")} shrink-0 self-start sm:self-auto`}>
              Ir para a Inbox
            </Link>
          }
        />
      )}

      {!setupComplete && (
        <Card padding="lg">
          <CardHeader
            title="Lista de verificação"
            description="Pode seguir a ordem que quiser — os três passos são necessários para produção."
          />
          <div className="space-y-4">
            <CheckRow
              done={snapshot.phoneConnected}
              title="Ligar o WhatsApp Business"
              detail="Número e credenciais na Meta — no assistente ou na área WhatsApp."
              href={snapshot.phoneConnected ? "/dashboard/whatsapp" : "/onboarding"}
              cta={snapshot.phoneConnected ? "Rever ligação" : "Ligar agora"}
            />
            <CheckRow
              done={snapshot.promptReady}
              title="Instruções para a IA"
              detail="Tom de voz e regras que a IA segue nas respostas automáticas."
              href="/onboarding"
              cta={snapshot.promptReady ? "Ajustar" : "Definir"}
            />
            <CheckRow
              done={snapshot.apiKeyReady}
              title="Chave de API"
              detail="Permite que outros sistemas falem com a sua conta com segurança."
              href="/onboarding"
              cta={snapshot.apiKeyReady ? "Rever" : "Gerar chave"}
            />
          </div>
          <p className="mt-6 rounded-xl border border-slate-100/80 bg-slate-50/50 px-4 py-3 text-xs leading-relaxed text-slate-500">
            Na Meta, confirme o webhook (URL pública) e o mesmo código de verificação do servidor.
          </p>
        </Card>
      )}

      {setupComplete && !hasActivity && !metricsLoading && (
        <Card
          padding="lg"
          className="border border-dashed border-slate-200/90 bg-gradient-to-b from-slate-50/60 to-white"
        >
          <CardHeader
            title="Validar antes de abrir ao público"
            description="Três passos rápidos para ter a certeza que tudo flui."
          />
          <ul className="list-none space-y-4 text-sm leading-relaxed text-slate-600">
            <li className="flex gap-3">
              <span className="font-semibold tabular-nums text-slate-400">1</span>
              <span>Escreva do telemóvel para o número Business que ligou.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold tabular-nums text-slate-400">2</span>
              <span>Na Meta, confirme webhook e subscrição da app.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold tabular-nums text-slate-400">3</span>
              <span>Volte à Inbox — a conversa deve surgir à esquerda.</span>
            </li>
          </ul>
          <div className="mt-8">
            <Link
              href="/dashboard/whatsapp"
              className={`${buttonClassName("ghost")} -ml-1 text-[var(--df-brand-700)] hover:bg-slate-50`}
            >
              Ver estado da ligação →
            </Link>
          </div>
        </Card>
      )}

      {setupComplete && (
        <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card padding="md" className="!p-5 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mensagens</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
              {metricsLoading ? "…" : (overview?.totalMessages ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Total no período</p>
          </Card>
          <Card padding="md" className="!p-5 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resposta média</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
              {metricsLoading ? "…" : `${overview?.avgResponseTimeMs ?? 0}`}
              <span className="text-lg font-semibold text-slate-400"> ms</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Tempo até primeira resposta</p>
          </Card>
          <Card padding="md" className="!p-5 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Automático</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
              {metricsLoading ? "…" : `${automationRate}%`}
            </p>
            <p className="mt-1 text-xs text-slate-500">Parte respondida sem humano</p>
          </Card>
          <Card padding="md" className="!p-5 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Equipa</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
              {metricsLoading ? "…" : (overview?.humanMessages ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Mensagens enviadas por pessoas</p>
          </Card>
        </div>
      )}

      {setupComplete && (
        <div className="grid gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Histórico recente" description="Volume, intenções e desempenho por agente." />
            <MetricsSection compact />
          </Card>
          <Card>
            <CardHeader title="Atalhos" description="Ir para as áreas mais usadas." />
            <div className="flex flex-col gap-1.5">
              <Link href="/inbox" className={`${buttonClassName("primary")} w-full justify-center`}>
                Inbox
              </Link>
              <Link href="/automation" className={`${buttonClassName("ghost")} w-full justify-center text-slate-700`}>
                Automações
              </Link>
              <Link href="/conversations" className={`${buttonClassName("ghost")} w-full justify-center text-slate-700`}>
                Conversas
              </Link>
              <Link href="/billing" className={`${buttonClassName("ghost")} w-full justify-center text-slate-600`}>
                Plano e uso
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
