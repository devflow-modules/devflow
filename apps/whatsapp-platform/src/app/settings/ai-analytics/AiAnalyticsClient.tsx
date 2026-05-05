"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MetricsCard } from "@devflow/ui";
import { Button } from "@/components/ui/button";
import { StateError, StateLoading } from "@/components/ui/app-states";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import { isWhiteLabelMode } from "@/lib/productMode";
import { SupportHelpButton } from "@/components/support/SupportHelpButton";

type Metrics = {
  messages_total: number;
  ai_messages_total: number;
  fallback_total: number;
  tokens_used_total: number;
  estimated_cost_usd: number;
};

type UsageStatus = {
  used: number;
  limit: number | null;
  percent_used: number | null;
  can_use: boolean;
  should_fallback_to_legacy: boolean;
  period: string;
  plan: string;
  ai_overage_billed?: number;
  ai_overage_cost_brl?: number;
};

type PlanInfo = {
  plan: string;
  plan_name: string;
  ai_limit: number | null;
  ai_limit_label: string;
};

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function getFallbackRateColor(rate: number): string {
  if (rate < 0.05) return "text-emerald-600";
  if (rate <= 0.15) return "text-amber-600";
  return "text-red-600";
}

function getFallbackRateLabel(rate: number): string {
  if (rate < 0.05) return "Saudável";
  if (rate <= 0.15) return "Atenção";
  return "Crítico";
}

function getInsights(metrics: Metrics): string[] {
  const insights: string[] = [];
  const fallbackRate =
    metrics.ai_messages_total + metrics.fallback_total > 0
      ? metrics.fallback_total /
        (metrics.ai_messages_total + metrics.fallback_total)
      : 0;

  if (fallbackRate > 0.15) {
    insights.push(
      `⚠️ Sua taxa de fallback está alta (${(fallbackRate * 100).toFixed(0)}%). Pode indicar problema na API ou prompt inadequado.`
    );
  }
  if (
    !isWhiteLabelMode() &&
    metrics.estimated_cost_usd > 1 &&
    metrics.tokens_used_total > 10000
  ) {
    insights.push(
      `💰 Considere reduzir maxTokens nas configurações de IA para controlar o consumo.`
    );
  }
  if (metrics.ai_messages_total === 0 && metrics.messages_total > 0) {
    insights.push(
      `ℹ️ Nenhuma resposta IA registrada ainda. Verifique se a IA está ativada e o prompt configurado.`
    );
  }
  return insights;
}

function getLimitInsight(usageStatus: UsageStatus | null): string | null {
  if (!usageStatus) return null;
  if (isWhiteLabelMode()) {
    if (!usageStatus.can_use) {
      return "Capacidade de IA esgotada neste período. Contacte o suporte para alinhar a operação.";
    }
    if (usageStatus.percent_used != null && usageStatus.percent_used >= 80) {
      return `Está a utilizar cerca de ${usageStatus.percent_used}% da margem de IA da operação neste período. Contacte o suporte se precisar de mais capacidade.`;
    }
    return null;
  }
  if (!usageStatus.can_use) {
    return "Capacidade de IA incluída no contrato esgotada neste período. Peça revisão ao suporte para voltar a ter margem no pacote incluído, ou confira em Contrato e uso como funciona o uso adicional («Uso adicional de IA» no extrato).";
  }
  if (usageStatus.percent_used != null && usageStatus.percent_used >= 80) {
    return (
      "Está a utilizar cerca de " +
      usageStatus.percent_used +
      "% das interações de IA incluídas no contrato neste período. Aproximar-se do limite não corta o serviço — além do incluído, pode haver uso adicional conforme o extrato do período."
    );
  }
  return null;
}

export function AiAnalyticsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const skipPlan = isWhiteLabelMode();
      const [rUsage, rStatus, rPlan] = await Promise.all([
        fetchProtected("/api/ai/usage"),
        fetchProtected("/api/billing/ai-usage-status"),
        skipPlan ? Promise.resolve({ ok: false } as Response) : fetchProtected("/api/billing/ai-plan"),
      ]);
      const jUsage = (await rUsage.json().catch(() => ({}))) as {
        success?: boolean;
        data?: Metrics;
        error?: string;
      };
      if (!rUsage.ok) {
        setError(protectedApiUserMessage(rUsage.status, jUsage));
        return;
      }
      const jStatus = rStatus.ok ? ((await rStatus.json().catch(() => ({}))) as { success?: boolean; data?: UsageStatus }) : null;
      const jPlan = rPlan.ok ? ((await rPlan.json().catch(() => ({}))) as { success?: boolean; data?: PlanInfo }) : null;
      if (jUsage.success) setMetrics(jUsage.data ?? null);
      if (jStatus?.success && jStatus.data !== undefined) setUsageStatus(jStatus.data);
      if (jPlan?.success && jPlan.data !== undefined) setPlanInfo(jPlan.data);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <StateLoading message="A carregar métricas de IA…" className="min-h-[14rem]" />;
  }
  if (error) {
    return (
      <StateError
        title="Não foi possível carregar as métricas"
        message={error}
        onRetry={() => void load()}
      />
    );
  }
  if (!metrics) return null;

  const atLimit = usageStatus && !usageStatus.can_use;
  const nearLimit =
    usageStatus?.percent_used != null && usageStatus.percent_used >= 80;

  const fallbackRate =
    metrics.ai_messages_total + metrics.fallback_total > 0
      ? metrics.fallback_total /
        (metrics.ai_messages_total + metrics.fallback_total)
      : 0;
  const insights = getInsights(metrics);
  const limitInsight = getLimitInsight(usageStatus);
  if (limitInsight) insights.unshift(limitInsight);

  const limitForRemaining = planInfo?.ai_limit ?? usageStatus?.limit ?? null;
  const remaining =
    limitForRemaining != null && usageStatus ? limitForRemaining - usageStatus.used : null;
  const estimatedHours = Math.round((metrics.ai_messages_total * 4) / 60);
  const wl = isWhiteLabelMode();

  return (
    <div className="min-w-0 space-y-6">
      {/* Card: Prova de valor (só exibe se tiver uso de IA) */}
      {metrics.ai_messages_total > 0 && (
        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 p-5 shadow-sm ring-1 ring-emerald-900/[0.06]">
          <h2 className="mb-2 text-base font-bold text-emerald-900">Valor gerado</h2>
          <p className="text-sm text-emerald-800">
            Você respondeu <strong>{metrics.ai_messages_total} clientes</strong> automaticamente este mês.
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Tempo economizado estimado: <strong>~{estimatedHours} horas</strong>
          </p>
        </div>
      )}

      {/* Card: capacidade de IA (SaaS mostra nome comercial do pacote; white-label só operação) */}
      {usageStatus && (wl || planInfo) && (
        <div
          className={`rounded-xl border p-5 shadow-sm ring-1 ${
            atLimit
              ? "border-red-500/40 bg-red-950/35 ring-red-500/15"
              : nearLimit
                ? "border-amber-500/35 bg-amber-950/30 ring-amber-500/12"
                : "border df-border-brand bg-[var(--df-bg-elevated)] ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]"
          }`}
        >
          <h2 className="mb-3 text-base font-bold tracking-tight text-[var(--df-text-primary)]">
            {wl ? (
              <>
                {atLimit ? "Capacidade atingida — " : nearLimit ? "Atenção: margem de IA — " : "Margem de IA — "}
                operação
              </>
            ) : (
              <>
                {atLimit ? "Limite atingido — " : nearLimit ? "Atenção: limite de IA — " : "Limite de IA — "}
                {planInfo?.plan_name ?? ""}
              </>
            )}
          </h2>
          {remaining != null && remaining > 0 && !atLimit && (
            <p className="text-sm font-medium text-[var(--df-text-primary)] mb-2">
              Você ainda pode usar: <strong>{remaining} respostas com IA</strong> este mês.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm">
              {wl && !planInfo
                ? `${usageStatus.used} / ${
                    usageStatus.limit != null ? usageStatus.limit.toLocaleString("pt-BR") : "—"
                  } interações com IA (operação)`
                : planInfo
                  ? `${usageStatus.used} / ${planInfo.ai_limit_label} respostas IA`
                  : `${usageStatus.used} / ${
                      usageStatus.limit != null ? usageStatus.limit.toLocaleString("pt-BR") : "—"
                    } interações com IA`}
            </span>
            {usageStatus.percent_used != null && (
              <span
                className={`text-sm font-medium ${
                  atLimit ? "text-red-600" : nearLimit ? "text-amber-600" : "text-[var(--df-text-secondary)]"
                }`}
              >
                {usageStatus.percent_used}% usado
              </span>
            )}
            {atLimit &&
              (wl ? (
                <SupportHelpButton variant="inline" className="text-sm" />
              ) : (
                <Link href="/billing">
                  <Button variant="secondary" size="sm">Contrato e uso</Button>
                </Link>
              ))}
            {nearLimit && !atLimit &&
              (wl ? (
                <SupportHelpButton variant="inline" className="text-sm" />
              ) : (
                <Link href="/billing">
                  <Button variant="secondary" size="sm">Continuar usando IA</Button>
                </Link>
              ))}
          </div>
          {atLimit && (
            <p className="mt-3 text-sm text-red-200">
              Sua IA parou de responder automaticamente. As mensagens estão sendo respondidas de forma limitada.
            </p>
          )}
          {usageStatus.percent_used != null &&
            usageStatus.percent_used < 80 &&
            planInfo != null &&
            planInfo.ai_limit != null &&
            !wl && (
            <p className="mt-2 text-xs text-[var(--df-text-muted)]">
              O contrato inclui {planInfo.ai_limit.toLocaleString("pt-BR")} respostas IA/mês. Fale com o suporte para mais capacidade.
            </p>
          )}
          {!wl &&
            planInfo != null &&
            usageStatus.ai_overage_billed != null &&
            usageStatus.ai_overage_billed > 0 && (
              <div className="mt-3 rounded-xl border border-amber-500/35 bg-amber-950/30 p-3 ring-1 ring-amber-500/12">
                <p className="text-sm font-medium text-amber-100">
                  Ultrapassou o incluído no contrato, mas a IA continuou ativa
                </p>
                <div className="mt-2 space-y-1 text-sm text-amber-200/95">
                  {planInfo.ai_limit != null && (
                    <p>
                      Incluído no contrato: {planInfo.ai_limit.toLocaleString("pt-BR")} · Usado: {usageStatus.used.toLocaleString("pt-BR")} · Uso adicional registado: <strong>{usageStatus.ai_overage_billed}</strong>
                    </p>
                  )}
                  {usageStatus.ai_overage_cost_brl != null &&
                    usageStatus.ai_overage_cost_brl > 0 && (
                      <p>Custo estimado do uso adicional: <strong>R$ {usageStatus.ai_overage_cost_brl.toFixed(2)}</strong></p>
                    )}
                </div>
                <p className="mt-1 text-xs text-amber-200/85">
                  Este valor aparece no extrato do período, com a mesma linha de descrição do uso adicional.
                </p>
              </div>
            )}
        </div>
      )}

      {/* Card: Uso */}
      <div className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-5 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]">
        <h2 className="mb-3 text-base font-bold tracking-tight text-[var(--df-text-primary)]">Uso</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetricsCard label="Total mensagens" value={String(metrics.messages_total)} />
          <MetricsCard label="Respostas IA" value={String(metrics.ai_messages_total)} />
          <MetricsCard label="Fallbacks" value={String(metrics.fallback_total)} />
        </div>
      </div>

      {/* Card: Custo (oculto em white-label — sem exposição de preço) */}
      {!wl && (
        <div className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-5 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]">
          <h2 className="mb-3 text-base font-bold tracking-tight text-[var(--df-text-primary)]">Estimativa de consumo</h2>
          <div className="grid grid-cols-2 gap-4">
            <MetricsCard
              label="Tokens usados"
              value={metrics.tokens_used_total.toLocaleString()}
            />
            <MetricsCard
              label="Referência (USD)"
              value={formatUSD(metrics.estimated_cost_usd)}
            />
          </div>
          {usageStatus?.ai_overage_billed != null &&
            usageStatus.ai_overage_billed > 0 &&
            usageStatus.ai_overage_cost_brl != null &&
            usageStatus.ai_overage_cost_brl > 0 && (
              <p className="mt-3 text-sm text-amber-800">
                Uso adicional de IA este mês:{" "}
                <strong>R$ {usageStatus.ai_overage_cost_brl.toFixed(2)}</strong>{" "}
                ({usageStatus.ai_overage_billed} respostas)
              </p>
            )}
        </div>
      )}

      {/* Card: Saúde da IA */}
      <div className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-5 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]">
        <h2 className="mb-3 text-base font-bold tracking-tight text-[var(--df-text-primary)]">Saúde da IA</h2>
        <div className="flex items-center gap-2">
          <span
            className={`text-lg font-medium ${getFallbackRateColor(fallbackRate)}`}
          >
            {(fallbackRate * 100).toFixed(1)}% fallback
          </span>
          <span
            className={`text-sm ${getFallbackRateColor(fallbackRate)}`}
          >
            — {getFallbackRateLabel(fallbackRate)}
          </span>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-5 ring-1 ring-amber-900/[0.05]">
          <h2 className="mb-2 text-base font-bold tracking-tight text-[var(--df-text-primary)]">Insights</h2>
          <ul className="space-y-1 text-sm text-[var(--df-text-secondary)]">
            {insights.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
