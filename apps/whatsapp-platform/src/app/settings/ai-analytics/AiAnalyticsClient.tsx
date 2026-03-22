"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MetricsCard, Button } from "@devflow/ui";

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
  if (metrics.estimated_cost_usd > 1 && metrics.tokens_used_total > 10000) {
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
  if (!usageStatus.can_use) {
    return "🚫 Sua IA parou de responder automaticamente. As mensagens estão sendo respondidas de forma limitada. Para voltar ao atendimento automático: faça upgrade do plano.";
  }
  if (usageStatus.percent_used != null && usageStatus.percent_used >= 70) {
    return "⚠️ Você já usou " + usageStatus.percent_used + "% das respostas com IA. Clientes podem começar a ficar sem resposta automática. Evite perder vendas — aumente seu plano agora.";
  }
  return null;
}

export function AiAnalyticsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [rUsage, rStatus, rPlan] = await Promise.all([
          fetch("/api/ai/usage", { credentials: "include" }),
          fetch("/api/billing/ai-usage-status", { credentials: "include" }),
          fetch("/api/billing/ai-plan", { credentials: "include" }),
        ]);
        if (!rUsage.ok) {
          if (rUsage.status === 401) setError("Faça login para continuar.");
          else setError("Falha ao carregar métricas.");
          return;
        }
        const jUsage = await rUsage.json();
        const jStatus = rStatus.ok ? await rStatus.json() : null;
        const jPlan = rPlan.ok ? await rPlan.json() : null;
        if (!c && jUsage.success) setMetrics(jUsage.data);
        if (!c && jStatus?.success) setUsageStatus(jStatus.data);
        if (!c && jPlan?.success) setPlanInfo(jPlan.data);
      } catch {
        if (!c) setError("Erro de conexão");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, []);

  if (loading) return <p className="text-slate-600">Carregando…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!metrics) return null;

  const atLimit = usageStatus && !usageStatus.can_use;
  const nearLimit =
    usageStatus?.percent_used != null && usageStatus.percent_used >= 70;

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

  return (
    <div className="space-y-6">
      {/* Card: Prova de valor (só exibe se tiver uso de IA) */}
      {metrics.ai_messages_total > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <h2 className="text-base font-semibold text-emerald-900 mb-2">
            💰 Valor gerado
          </h2>
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
          className={`rounded-lg border p-4 shadow-sm ${
            atLimit
              ? "border-2 border-red-400 bg-red-50"
              : nearLimit
                ? "border-2 border-amber-400 bg-amber-50"
                : "border-slate-200 bg-white"
          }`}
        >
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            {nearLimit && "⚠️ "}
            {atLimit && "🚫 "}
            Limite de IA — {planInfo.plan_name}
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
            {atLimit && (
              <Link href="/billing">
                <Button size="sm">Fazer upgrade do plano</Button>
              </Link>
            )}
            {nearLimit && !atLimit && (
              <Link href="/billing">
                <Button size="sm">Continuar usando IA</Button>
              </Link>
            )}
          </div>
          {atLimit && (
            <p className="mt-3 text-sm text-red-800">
              Sua IA parou de responder automaticamente. As mensagens estão sendo respondidas de forma limitada.
            </p>
          )}
          {usageStatus.percent_used != null && usageStatus.percent_used < 70 && planInfo.ai_limit != null && (
            <p className="mt-2 text-xs text-slate-500">
              Plano inclui {planInfo.ai_limit.toLocaleString("pt-BR")} respostas IA/mês. Upgrade oferece mais capacidade.
            </p>
          )}
          {usageStatus.ai_overage_billed != null &&
            usageStatus.ai_overage_billed > 0 && (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">
                  Você excedeu o plano, mas a IA continuou ativa
                </p>
                <div className="mt-2 space-y-1 text-sm text-amber-800">
                  {planInfo.ai_limit != null && (
                    <p>
                      Incluído no plano: {planInfo.ai_limit.toLocaleString("pt-BR")} · Usado: {usageStatus.used.toLocaleString("pt-BR")} · Excedente faturado: <strong>{usageStatus.ai_overage_billed}</strong>
                    </p>
                  )}
                  {usageStatus.ai_overage_cost_brl != null &&
                    usageStatus.ai_overage_cost_brl > 0 && (
                      <p>Custo estimado do excedente: <strong>R$ {usageStatus.ai_overage_cost_brl.toFixed(2)}</strong></p>
                    )}
                </div>
                <p className="mt-1 text-xs text-amber-700">
                  Este valor será refletido na cobrança.
                </p>
              </div>
            )}
        </div>
      )}

      {/* Card: Uso */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Uso</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetricsCard label="Total mensagens" value={String(metrics.messages_total)} />
          <MetricsCard label="Respostas IA" value={String(metrics.ai_messages_total)} />
          <MetricsCard label="Fallbacks" value={String(metrics.fallback_total)} />
        </div>
      </div>

      {/* Card: Custo */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Custo</h2>
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

      {/* Card: Saúde da IA */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Saúde da IA
        </h2>
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-base font-semibold text-slate-900 mb-2">
            Insights
          </h2>
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
