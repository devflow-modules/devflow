"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TenantSnapshot } from "@/lib/tenant-session";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MetricsSection } from "@/app/dashboard/MetricsSection";
import { ManagerDashboardSection } from "@/components/dashboard/ManagerDashboardSection";
import { readVerifyPayload } from "@/lib/api-json-client";
import { fetchProtected } from "@/lib/protected-fetch";
import { PostActivationGuide } from "@/components/dashboard/PostActivationGuide";
import { SupportHelpButton } from "@/components/support/SupportHelpButton";
import { isOperator, isTenantManager } from "@/lib/roles";
import type { UserRole } from "@/modules/auth";
import { isWhiteLabelMode } from "@/lib/productMode";

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
    <div className="df-card-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

const KNOWN_ROLES = new Set<UserRole>(["operator", "manager", "platform_admin"]);

export function DashboardClient({ snapshot }: { snapshot: TenantSnapshot }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(() => snapshot.authenticated);
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!snapshot.authenticated) return;
    fetchProtected("/api/metrics/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.overview) setOverview(data.overview);
      })
      .finally(() => setMetricsLoading(false));
  }, [snapshot.authenticated]);

  useEffect(() => {
    if (!snapshot.authenticated) return;
    let cancelled = false;
    fetchProtected("/api/auth/verify")
      .then((r) => r.json())
      .then((raw: unknown) => {
        if (cancelled) return;
        const d = readVerifyPayload(raw);
        const r = d.user?.role;
        if (r && KNOWN_ROLES.has(r as UserRole)) setSessionRole(r as UserRole);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [snapshot.authenticated]);

  if (!snapshot.authenticated) {
    return (
      <div className="df-stack">
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

  const activationComplete = snapshot.activationComplete;
  const hasActivity =
    overview !== null && (overview.totalMessages > 0 || (overview.automaticMessages ?? 0) + (overview.humanMessages ?? 0) > 0);

  const automationRate =
    overview && overview.totalMessages > 0
      ? Math.round((overview.automaticMessages / overview.totalMessages) * 100)
      : 0;

  const firstIncompleteHref = "/onboarding";

  return (
    <div className="df-stack-relaxed">
      <div className="flex justify-end">
        <SupportHelpButton variant="inline" />
      </div>
      {sessionRole && isOperator(sessionRole) && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-5 py-4 text-sm text-emerald-950">
          <p className="font-semibold">Pronto para atender</p>
          <p className="mt-1 text-emerald-900/90">
            Está na conta certa para operar conversas. Abra a Inbox para responder clientes em tempo real.
          </p>
          <div className="mt-3">
            <Link href="/inbox" className={`${buttonClassName("primary")} inline-flex text-sm`}>
              Abrir Inbox
            </Link>
          </div>
        </div>
      )}

      {!activationComplete && (
        <PageHeader
          eyebrow="Ativação"
          eyebrowTone="amber"
          title="Conclua a ativação"
          description="Instruções do assistente e ligação do WhatsApp Business. Depois, as mensagens aparecem na Inbox. Integrações com API são opcionais."
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

      {activationComplete && !hasActivity && !metricsLoading && (
        <PageHeader
          eyebrow="Inbox"
          eyebrowTone="neutral"
          title="Vamos à primeira conversa"
          description="A conta está ativa. Envie um teste do WhatsApp no telemóvel para o número Business — a thread aparece na Inbox em segundos."
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

      {activationComplete && (hasActivity || metricsLoading) && (
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

      {!activationComplete && (
        <Card padding="lg">
          <CardHeader
            title="Lista de verificação"
            description="Dois passos para ativar o atendimento. A chave de API é só para integrações — fica em Configurações → API e integrações."
          />
          <div className="df-stack-tight">
            <CheckRow
              done={snapshot.promptReady}
              title="Instruções do assistente"
              detail="Segmento, objetivo e tom — ou texto manual nas configurações."
              href="/onboarding"
              cta={snapshot.promptReady ? "Rever" : "Configurar"}
            />
            <CheckRow
              done={snapshot.phoneConnected}
              title="WhatsApp Business ligado"
              detail="Phone Number ID e token da Meta; estado também em WhatsApp no menu."
              href={snapshot.phoneConnected ? "/dashboard/whatsapp" : "/onboarding"}
              cta={snapshot.phoneConnected ? "Rever ligação" : "Ligar agora"}
            />
          </div>
          {sessionRole && isTenantManager(sessionRole) ? (
            snapshot.apiKeyReady ? (
              <p className="mt-4 text-xs text-slate-500">
                Chave de API já gerada —{" "}
                <Link href="/settings/developer" className="font-medium text-[var(--df-brand-700)] underline">
                  gerir em API e integrações
                </Link>
                .
              </p>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Precisa de API para integrações?{" "}
                <Link href="/settings/developer" className="font-medium text-[var(--df-brand-700)] underline">
                  Gerar chave
                </Link>
                .
              </p>
            )
          ) : sessionRole && isOperator(sessionRole) ? (
            <p className="mt-4 text-xs text-slate-500">
              Integrações com API: peça a um admin em Configurações → API e integrações.
            </p>
          ) : null}
          <p className="mt-6 rounded-xl border border-slate-100/80 bg-slate-50/50 px-4 py-3 text-xs leading-relaxed text-slate-500">
            Na Meta, confirme o webhook (URL pública) e o mesmo código de verificação do servidor.
          </p>
        </Card>
      )}

      {activationComplete && !hasActivity && !metricsLoading && (
        <Card
          padding="lg"
          className="border border-dashed border-slate-200/90 bg-gradient-to-b from-slate-50/60 to-white"
        >
          <CardHeader
            title="Primeiro valor na Inbox"
            description="Siga o guia abaixo — é o caminho mais curto para ver mensagens a entrar no sistema."
          />
          <PostActivationGuide
            displayNumber={snapshot.primaryBusinessDisplayNumber}
            phoneNumberId={snapshot.primaryBusinessPhoneNumberId}
            lineStatus={snapshot.primaryLineStatus}
          />
          <p className="mt-8 rounded-xl border border-slate-100/80 bg-white/60 px-4 py-3 text-xs leading-relaxed text-slate-600">
            Antes de divulgar o número aos clientes, confirme na Meta o webhook público e o código de verificação — detalhes em{" "}
            <Link href="/dashboard/whatsapp" className="font-medium text-[var(--df-brand-700)] underline">
              Estado da ligação
            </Link>
            .
          </p>
        </Card>
      )}

      {activationComplete && (
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

      {activationComplete && (
        <ManagerDashboardSection />
      )}

      {activationComplete && (
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
              <Link href="/inbox" className={`${buttonClassName("ghost")} w-full justify-center text-slate-700`}>
                Conversas
              </Link>
              {!isWhiteLabelMode() ? (
                <Link href="/billing" className={`${buttonClassName("ghost")} w-full justify-center text-slate-600`}>
                  Plano e uso
                </Link>
              ) : null}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
