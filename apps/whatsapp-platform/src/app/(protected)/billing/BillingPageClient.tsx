"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PLANS, getPlan, normalizePlan, type PlanKey } from "@/modules/billing/plans";
import {
  billingChangePlanButtonLabel,
  COMMERCIAL_CHECKOUT_CTA,
  COMMERCIAL_PLAN_BENEFITS,
  COMMERCIAL_PLAN_HEADLINE,
  COMMERCIAL_PLAN_SUBTITLE,
  COMMERCIAL_RECOMMENDED_BADGE,
  COMMERCIAL_RECOMMENDED_PLAN,
  HOW_FULL_OPERATION_WORKS,
} from "@/modules/billing/planPresentation";
import { freeEvaluationStaleMessage } from "@/modules/billing/demoEvaluation";
import {
  formatIncludedUsageSentence,
  STRIPE_USAGE_LINE_LABELS,
  USAGE_AFTER_INCLUDED_EXPLAINER,
  USAGE_ANTI_SURPRISE_LINE,
} from "@/modules/billing/usageCommunication";
import { CurrentPlanUpgradeHint } from "@/components/dashboard/billing/CurrentPlanUpgradeHint";
import { HowFreePlanWorksSection } from "@/components/dashboard/billing/HowFreePlanWorksSection";
import { HowUsageWorksSection } from "@/components/dashboard/billing/HowUsageWorksSection";
import { UsageCard } from "@/components/dashboard/billing/UsageCard";
import { StateError, StateLoading } from "@/components/ui/app-states";
import { readBillingPostUrl, readSubscriptionFromApiJson } from "@/lib/api-json-client";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

type Sub = {
  plan: string;
  tenantCreatedAt?: string | null;
  status: string;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
  activeUntil: string | null;
  cancelAtPeriodEnd: boolean;
  meteredBillingConfigured: boolean;
  lastInvoiceId: string | null;
  lastInvoiceStatus: string | null;
  lastInvoiceAmountPaid: number | null;
};

type Usage = {
  period: string;
  messagesSent: number;
  aiResponses: number;
  limits: { messagesPerMonth: number | null; aiResponsesPerMonth: number | null };
  unitPricesBrl: { message: number; aiResponse: number };
  estimatedVariableCostBrl: number;
  withinLimits: { messages: boolean; ai: boolean };
  allowsMeteredOverage: boolean;
  enforceLimits: boolean;
  aiOverageBilled?: number;
  aiOverageCostBrl?: number;
  stripeMetered?: {
    messagesReportedToStripe: number;
    aiReportedToStripe: number;
    pendingStripeReports: number;
  };
};

/** Pacotes mostrados no modal de ativação (venda consultiva: um pacote pago). */
const MODAL_CHECKOUT_PLANS: PlanKey[] = ["OPERATIONAL_BASE"];

function displayPlanName(plan: string | undefined): string {
  return getPlan(plan).name;
}

function subscriptionStatusPt(status: string | undefined): string {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return "Ativo — pagamentos em dia";
  if (s === "TRIAL") return "Período de teste";
  if (s === "PAST_DUE") return "Pagamento em falta — atualize o método";
  if (s === "CANCELED" || s === "CANCELLED") return "Cancelado";
  return status ?? "—";
}

function nextRenewalLabel(iso: string | null | undefined): string {
  if (!iso) return "Quando tiver mensalidade ativa, mostramos aqui a data da próxima renovação.";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function BillingPageClient() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const canceledParam = searchParams.get("canceled");
  const [sub, setSub] = useState<Sub | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanKey | null>(null);
  const [, setUpgradeLoading] = useState<PlanKey | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [r1, r2] = await Promise.all([
        fetchProtected("/api/billing/subscription"),
        fetchProtected("/api/billing/usage"),
      ]);
      const j1 = await r1.json().catch(() => ({}));
      const j2 = (await r2.json().catch(() => ({}))) as { data?: Usage; error?: string };
      if (!r1.ok) {
        setErr(protectedApiUserMessage(r1.status, j1 as { error?: string }));
        return;
      }
      if (!r2.ok) {
        setErr(protectedApiUserMessage(r2.status, j2));
        return;
      }
      setSub(readSubscriptionFromApiJson(j1));
      setUsage(j2.data ?? null);
    } catch {
      setErr("Erro de rede");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const beyondIncluded =
    usage && (!usage.withinLimits.messages || !usage.withinLimits.ai);

  async function openPortal() {
    setPortalLoading(true);
    setErr(null);
    const endpoints = ["/api/stripe/portal", "/api/billing/portal"];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: "POST", credentials: "include" });
        const j = await res.json();
        if (!res.ok) {
          const ej = j as { error?: string | { message?: string } };
          const msg =
            typeof ej.error === "object" && ej.error && "message" in ej.error
              ? String((ej.error as { message?: string }).message)
              : typeof ej.error === "string"
                ? ej.error
                : "Falha";
          throw new Error(msg);
        }
        const postUrl = readBillingPostUrl(j);
        if (postUrl) {
          window.location.href = postUrl;
          return;
        }
      } catch (e) {
        if (url === endpoints[1]) {
          setErr(e instanceof Error ? e.message : "Portal indisponível");
        }
      }
    }
    setPortalLoading(false);
  }

  async function checkout(plan: PlanKey) {
    setCheckoutLoading(plan);
    setErr(null);
    try {
      const endpoints = ["/api/stripe/checkout", "/api/billing/checkout"];
      for (const url of endpoints) {
        try {
          const res = await fetchProtected(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j as { error?: string }));
          const postUrl = readBillingPostUrl(j);
          if (postUrl) {
            window.location.href = postUrl;
            return;
          }
        } catch {
          continue;
        }
      }
      await upgradeStub(plan);
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function upgradeStub(plan: PlanKey) {
    setUpgradeLoading(plan);
    setErr(null);
    try {
      const res = await fetchProtected("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j));
      await load();
      setShowUpgradeModal(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao ajustar o contrato");
    } finally {
      setUpgradeLoading(null);
    }
  }

  const normalizedCurrentPlan = normalizePlan(sub?.plan);
  const evaluationStaleHint =
    sub && normalizedCurrentPlan === "FREE"
      ? freeEvaluationStaleMessage(sub.plan, sub.tenantCreatedAt ?? null)
      : null;

  if (loading) {
    return <StateLoading message="A carregar contrato e uso…" className="min-h-[40vh]" />;
  }

  return (
    <div className="min-w-0 space-y-8">
      {successParam === "true" && (
        <div className="df-feedback-success" role="status">
          <p className="font-medium">Contrato atualizado com sucesso.</p>
        </div>
      )}
      {canceledParam === "true" && (
        <div className="rounded-lg border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_45%,var(--df-bg-elevated))] px-4 py-3 text-sm text-[var(--df-text-secondary)]">
          <p>Ativação ou pagamento cancelado.</p>
        </div>
      )}
      {sub ? <CurrentPlanUpgradeHint plan={sub.plan} /> : null}
      {evaluationStaleHint ? (
        <div className="df-feedback-info" role="status">
          {evaluationStaleHint}
        </div>
      ) : null}
      {beyondIncluded && usage?.enforceLimits && usage.allowsMeteredOverage && (
        <div className="df-feedback-warning py-4" role="alert">
          <p className="font-semibold">Volume incluído no contrato atingido neste período</p>
          <p className="mt-1 opacity-95">
            Com o modo de enforcement ativo, o serviço pode limitar funcionalidades até rever a capacidade contratada ou o período
            renovar. Fale com o suporte para alinhar margem no pacote incluído.
          </p>
          <Button variant="secondary" type="button" size="sm" className="mt-3" onClick={() => setShowUpgradeModal(true)}>
            Ver capacidades e continuar
          </Button>
        </div>
      )}
      {beyondIncluded && usage?.enforceLimits && !usage.allowsMeteredOverage && (
        <div className="df-feedback-warning py-4" role="alert">
          <p className="font-semibold">Limite da avaliação guiada atingido neste período</p>
          <p className="mt-1 opacity-95">
            A demonstração não inclui expansão faturada. Para continuar o atendimento sem teto da avaliação, avance para
            a operação completa (implantação + mensalidade) com a nossa equipa.
          </p>
          <Button variant="secondary" type="button" size="sm" className="mt-3" onClick={() => setShowUpgradeModal(true)}>
            {COMMERCIAL_CHECKOUT_CTA.OPERATIONAL_BASE}
          </Button>
        </div>
      )}
      {beyondIncluded && usage && !usage.enforceLimits && (
        <div className="rounded-lg border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_45%,var(--df-bg-elevated))] px-4 py-4 text-sm text-[var(--df-text-primary)]">
          <p className="font-semibold">Ultrapassou o incluído no contrato — o atendimento continua</p>
          <p className="mt-1 text-[var(--df-text-secondary)]">
            O uso adicional («{STRIPE_USAGE_LINE_LABELS.extraConversations}» e «{STRIPE_USAGE_LINE_LABELS.extraAi}») é
            registado e consolidado no fim do período mensal. {USAGE_ANTI_SURPRISE_LINE}
          </p>
        </div>
      )}

      {err ? (
        <StateError
          title="Não foi possível atualizar os dados"
          message={err}
          onRetry={() => {
            setLoading(true);
            void load();
          }}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border df-border-brand bg-gradient-to-br from-[var(--df-bg-elevated)] to-[var(--df-bg-app)] p-5 shadow-md sm:p-8">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--df-text-muted)]">Contrato ativo</p>
            {sub ? (
              <>
                <p className="mt-1 text-sm font-medium text-[var(--df-text-muted)]">{displayPlanName(sub.plan)}</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--df-text-primary)]">
                  {COMMERCIAL_PLAN_HEADLINE[getPlan(sub.plan).key]}
                </h2>
              </>
            ) : (
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--df-text-primary)]">—</h2>
            )}
            <p className="mt-2 text-sm font-medium text-[var(--df-text-secondary)]">
              {sub ? subscriptionStatusPt(sub.status) : "Carregue novamente se não vir dados."}
            </p>
            <p className="mt-4 text-sm text-[var(--df-text-secondary)]">
              <span className="font-semibold text-[var(--df-text-primary)]">Próxima renovação ou fim do período:</span>{" "}
              <span className="block sm:inline">{nextRenewalLabel(sub?.currentPeriodEnd ?? sub?.activeUntil)}</span>
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
            <Button variant="secondary" type="button" className="font-semibold" onClick={() => setShowUpgradeModal(true)}>
              {sub && normalizePlan(sub.plan) === "FREE"
                ? COMMERCIAL_CHECKOUT_CTA.OPERATIONAL_BASE
                : sub
                  ? billingChangePlanButtonLabel(getPlan(sub.plan).key)
                  : "Ajustar contrato"}
            </Button>
            {sub?.stripeCustomerId ? (
              <Button type="button" variant="outline" onClick={() => void openPortal()} disabled={portalLoading}>
                {portalLoading ? "A abrir…" : "Documentos e método de pagamento"}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {usage &&
        (usage.allowsMeteredOverage ? (
          <HowUsageWorksSection unitPrices={usage.unitPricesBrl} />
        ) : (
          <HowFreePlanWorksSection planKey={normalizePlan(sub?.plan ?? "FREE")} />
        ))}

      {normalizedCurrentPlan === "FREE" ? (
        <section className="rounded-2xl border df-border-brand bg-[var(--df-bg-elevated)] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--df-text-primary)]">{HOW_FULL_OPERATION_WORKS.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--df-text-secondary)]">{HOW_FULL_OPERATION_WORKS.intro}</p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-[var(--df-text-secondary)]">
            {HOW_FULL_OPERATION_WORKS.bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Button variant="secondary" type="button" className="mt-5 font-semibold" onClick={() => setShowUpgradeModal(true)}>
            {COMMERCIAL_CHECKOUT_CTA.OPERATIONAL_BASE}
          </Button>
        </section>
      ) : null}

      {usage && (
        <section className="rounded-2xl border df-border-brand bg-[var(--df-bg-elevated)] p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--df-text-primary)]">Consumo do período</h2>
              <p className="text-sm text-[var(--df-text-muted)]">{usage.period}</p>
            </div>
            <Link
              href="/settings/ai-analytics"
              className="text-sm font-semibold text-[var(--df-brand-700)] hover:underline"
            >
              Ver detalhe de IA →
            </Link>
          </div>
          <p className="mb-4 rounded-lg border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_52%,var(--df-bg-elevated))] px-3 py-2.5 text-xs leading-relaxed text-[var(--df-text-secondary)]">
            {usage.allowsMeteredOverage ? (
              <>
                Comparado com o que o contrato inclui por mês. Depois do incluído, entra em vigor o uso adicional — o
                atendimento continua. No extrato do período, aparece como «{STRIPE_USAGE_LINE_LABELS.extraConversations}» e «
                {STRIPE_USAGE_LINE_LABELS.extraAi}».
              </>
            ) : (
              <>
                Comparado com o incluído na avaliação guiada. Ao atingir o limite, é necessário ativar a operação
                completa — não há cobrança adicional nem expansão automática nesta fase.
              </>
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <UsageCard
              title="Conversas no período"
              used={usage.messagesSent}
              limit={usage.limits.messagesPerMonth}
              percentage={
                usage.limits.messagesPerMonth != null && usage.limits.messagesPerMonth > 0
                  ? Math.round((usage.messagesSent / usage.limits.messagesPerMonth) * 100)
                  : null
              }
              includedKindLabel="conversas incluídas"
            />
            <UsageCard
              title="Interações de IA no período"
              used={usage.aiResponses}
              limit={usage.limits.aiResponsesPerMonth}
              percentage={
                usage.limits.aiResponsesPerMonth != null && usage.limits.aiResponsesPerMonth > 0
                  ? Math.round((usage.aiResponses / usage.limits.aiResponsesPerMonth) * 100)
                  : null
              }
              includedKindLabel="interações de IA incluídas"
            />
          </div>
          {usage.allowsMeteredOverage && (!usage.withinLimits.messages || !usage.withinLimits.ai) ? (
            <p className="df-text-warning mt-3 text-xs font-medium">
              Parte do consumo está além do volume incluído — o uso adicional será refletido no extrato do período, sem interromper o
              serviço.
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {usage.aiOverageBilled != null && usage.aiOverageBilled > 0 && (
              <div className="df-feedback-success mt-3 !py-3">
                <p className="text-sm font-medium">{STRIPE_USAGE_LINE_LABELS.extraAi} (expansão de uso)</p>
                <p className="mt-1 text-sm">
                  <strong>{usage.aiOverageBilled.toLocaleString("pt-BR")}</strong> interações além do incluído
                  {usage.aiOverageCostBrl != null && usage.aiOverageCostBrl > 0 && (
                    <> · estimativa R$ {usage.aiOverageCostBrl.toFixed(2)}</>
                  )}
                </p>
                <p className="mt-1 text-xs opacity-90">
                  O mesmo nome aparece no extrato do período para facilitar o acompanhamento.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowUpgradeModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[90vh] overflow-y-auto rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-6 shadow-xl sm:max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Ativar operação contratada</h3>
            <p className="text-sm text-[var(--df-text-secondary)] mb-4">
              Pacote operacional único (mensal + uso adicional transparente). {USAGE_AFTER_INCLUDED_EXPLAINER}{" "}
              {USAGE_ANTI_SURPRISE_LINE}
            </p>
            <div className="flex flex-col gap-3">
              {MODAL_CHECKOUT_PLANS.map((key) => {
                const def = PLANS[key];
                const isCurrent = normalizedCurrentPlan === key;
                const price =
                  def.priceBrl > 0
                    ? `R$ ${def.priceBrl}/mês`
                    : key === "FREE"
                      ? "Avaliação (sem cobrança)"
                      : "Mensalidade conforme contrato acordado";
                const isRecommended = key === COMMERCIAL_RECOMMENDED_PLAN;
                const benefits = COMMERCIAL_PLAN_BENEFITS[key];
                const cta = COMMERCIAL_CHECKOUT_CTA[key];
                return (
                  <div
                    key={key}
                    className={`rounded-xl p-4 ${
                      isRecommended && !isCurrent
                        ? "df-feedback-warning !rounded-xl shadow-md ring-2 ring-[color:rgb(245_158_11/0.35)]"
                        : "border df-border-brand bg-[var(--df-bg-elevated)]"
                    } ${isCurrent ? "opacity-90" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">{def.name}</p>
                        <p className="mt-0.5 text-base font-semibold text-[var(--df-text-primary)]">{COMMERCIAL_PLAN_HEADLINE[key]}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--df-text-secondary)]">{COMMERCIAL_PLAN_SUBTITLE[key]}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-[var(--df-text-primary)]">{price}</span>
                        {isRecommended && !isCurrent ? (
                          <span className="df-badge-warning mt-1 flex w-full justify-center">
                            {COMMERCIAL_RECOMMENDED_BADGE}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 rounded-lg bg-[color-mix(in_srgb,var(--df-bg-app)_55%,var(--df-bg-elevated))] px-2.5 py-2 text-xs font-medium leading-snug text-[var(--df-text-primary)]">
                      {formatIncludedUsageSentence(key)}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--df-text-muted)]">{USAGE_AFTER_INCLUDED_EXPLAINER}</p>
                    <ul className="mt-3 space-y-1.5 border-t df-border-brand pt-3 text-xs text-[var(--df-text-secondary)]">
                      {benefits.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="df-text-success" aria-hidden>
                            ✓
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      className={`mt-4 w-full ${isRecommended && !isCurrent ? "font-semibold shadow-sm" : ""}`}
                      variant={isCurrent ? "ghost" : isRecommended ? "default" : "outline"}
                      onClick={() => (isCurrent ? null : void checkout(key))}
                      disabled={isCurrent || !!checkoutLoading}
                    >
                      {isCurrent
                        ? "Contrato atual"
                        : checkoutLoading === key
                          ? "A redirecionar…"
                          : cta}
                    </Button>
                  </div>
                );
              })}
              <Button type="button" variant="ghost" onClick={() => setShowUpgradeModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
