"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MetricsCard, Button } from "@devflow/ui";
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
      `💰 Considere reduzir maxTokens nas configurações de IA para controlar o custo.`
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
    return "Incluído no plano esgotado para interações de IA neste período. Atualize o plano para voltar a ter margem no pacote incluído, ou confira em Plano e faturação como funciona o uso adicional («Uso adicional de IA» na fatura).";
  }
  if (usageStatus.percent_used != null && usageStatus.percent_used >= 80) {
    return (
      "Está a utilizar cerca de " +
      usageStatus.percent_used +
      "% das interações de IA incluídas no plano neste período. Aproximar-se do limite não corta o serviço — além do incluído, pode haver uso adicional conforme a fatura."
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
      const [rUsage, rStatus, rPlan] = await Promise.all([
        fetchProtected("/api/ai/usage"),
        fetchProtected("/api/billing/ai-usage-status"),
        fetchProtected("/api/billing/ai-plan"),
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

  const remaining = planInfo?.ai_limit != null && usageStatus ? planInfo.ai_limit - usageStatus.used : null;
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

      {/* Card: Limite do plano */}
      {usageStatus && planInfo && (
        <div
          className={`rounded-xl border p-5 shadow-sm ring-1 ${
            atLimit
              ? "border-red-300/90 bg-red-50/90 ring-red-900/[0.06]"
              : nearLimit
                ? "border-amber-300/90 bg-amber-50/90 ring-amber-900/[0.06]"
                : "border-slate-200/90 bg-white ring-slate-900/[0.03]"
          }`}
        >
          <h2 className="mb-3 text-base font-bold tracking-tight text-slate-900">
            {wl ? (
              <>
                {atLimit ? "Capacidade atingida — " : nearLimit ? "Atenção: margem de IA — " : "Margem de IA — "}
                operação
              </>
            ) : (
              <>
                {atLimit ? "Limite atingido — " : nearLimit ? "Atenção: limite de IA — " : "Limite de IA — "}
                {planInfo.plan_name}
              </>
            )}
          </h2>
          {remaining != null && remaining > 0 && !atLimit && (
            <p className="text-sm font-medium text-slate-800 mb-2">
              Você ainda pode usar: <strong>{remaining} respostas com IA</strong> este mês.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm">
              {usageStatus.used} / {planInfo.ai_limit_label} respostas IA
            </span>
            {usageStatus.percent_used != null && (
              <span
                className={`text-sm font-medium ${
                  atLimit ? "text-red-600" : nearLimit ? "text-amber-600" : "text-slate-600"
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
                  <Button size="sm">Fazer upgrade do plano</Button>
                </Link>
              ))}
            {nearLimit && !atLimit &&
              (wl ? (
                <SupportHelpButton variant="inline" className="text-sm" />
              ) : (
                <Link href="/billing">
                  <Button size="sm">Continuar usando IA</Button>
                </Link>
              ))}
          </div>
          {atLimit && (
            <p className="mt-3 text-sm text-red-800">
              Sua IA parou de responder automaticamente. As mensagens estão sendo respondidas de forma limitada.
            </p>
          )}
          {usageStatus.percent_used != null && usageStatus.percent_used < 80 && planInfo.ai_limit != null && !wl && (
            <p className="mt-2 text-xs text-slate-500">
              Plano inclui {planInfo.ai_limit.toLocaleString("pt-BR")} respostas IA/mês. Upgrade oferece mais capacidade.
            </p>
          )}
          {!wl &&
            usageStatus.ai_overage_billed != null &&
            usageStatus.ai_overage_billed > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 ring-1 ring-amber-900/[0.04]">
                <p className="text-sm font-medium text-amber-900">
                  Você excedeu o plano, mas a IA continuou ativa
                </p>
                <div className="mt-2 space-y-1 text-sm text-amber-800">
                  {planInfo.ai_limit != null && (
                    <p>
                      Incluído no plano: {planInfo.ai_limit.toLocaleString("pt-BR")} · Usado: {usageStatus.used.toLocaleString("pt-BR")} · Uso adicional faturado: <strong>{usageStatus.ai_overage_billed}</strong>
                    </p>
                  )}
                  {usageStatus.ai_overage_cost_brl != null &&
                    usageStatus.ai_overage_cost_brl > 0 && (
                      <p>Custo estimado do uso adicional: <strong>R$ {usageStatus.ai_overage_cost_brl.toFixed(2)}</strong></p>
                    )}
                </div>
                <p className="mt-1 text-xs text-amber-700">
                  Este valor aparece na fatura do período, com o mesmo nome de linha do Stripe.
                </p>
              </div>
            )}
        </div>
      )}

      {/* Card: Uso */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
        <h2 className="mb-3 text-base font-bold tracking-tight text-slate-900">Uso</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetricsCard label="Total mensagens" value={String(metrics.messages_total)} />
          <MetricsCard label="Respostas IA" value={String(metrics.ai_messages_total)} />
          <MetricsCard label="Fallbacks" value={String(metrics.fallback_total)} />
        </div>
      </div>

      {/* Card: Custo (oculto em white-label — sem exposição de preço) */}
      {!wl && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <h2 className="mb-3 text-base font-bold tracking-tight text-slate-900">Custo</h2>
          <div className="grid grid-cols-2 gap-4">
            <MetricsCard
              label="Tokens usados"
              value={metrics.tokens_used_total.toLocaleString()}
            />
            <MetricsCard
              label="Custo estimado (USD)"
              value={formatUSD(metrics.estimated_cost_usd)}
            />
          </div>
          {usageStatus?.ai_overage_billed != null &&
            usageStatus.ai_overage_billed > 0 &&
            usageStatus.ai_overage_cost_brl != null &&
            usageStatus.ai_overage_cost_brl > 0 && (
              <p className="mt-3 text-sm text-amber-800">
                Excedente IA este mês:{" "}
                <strong>R$ {usageStatus.ai_overage_cost_brl.toFixed(2)}</strong>{" "}
                ({usageStatus.ai_overage_billed} respostas)
              </p>
            )}
        </div>
      )}

      {/* Card: Saúde da IA */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
        <h2 className="mb-3 text-base font-bold tracking-tight text-slate-900">Saúde da IA</h2>
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
          <h2 className="mb-2 text-base font-bold tracking-tight text-slate-900">Insights</h2>
          <ul className="space-y-1 text-sm text-slate-700">
            {insights.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
