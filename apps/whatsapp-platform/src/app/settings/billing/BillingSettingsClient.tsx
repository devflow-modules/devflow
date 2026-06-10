"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StateError, StateLoading } from "@/components/ui/app-states";
import { HowFreePlanWorksSection } from "@/components/dashboard/billing/HowFreePlanWorksSection";
import { HowUsageWorksSection } from "@/components/dashboard/billing/HowUsageWorksSection";
import { normalizePlan } from "@/modules/billing/plans";
import { freeEvaluationStaleMessage } from "@/modules/billing/demoEvaluation";
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
  allowsMeteredOverage?: boolean;
  enforceLimits: boolean;
  stripeMetered?: {
    messagesReportedToStripe: number;
    aiReportedToStripe: number;
    pendingStripeReports: number;
  };
};

export function BillingSettingsClient() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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

  async function openPortal() {
    setPortalLoading(true);
    setErr(null);
    try {
      const res = await fetchProtected("/api/billing/portal", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j as { error?: string }));
      const url = readBillingPostUrl(j);
      if (!url) throw new Error("URL da área de pagamentos não disponível.");
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Portal indisponível");
    } finally {
      setPortalLoading(false);
    }
  }

  async function checkoutOperational() {
    setCheckoutLoading("OPERATIONAL_BASE");
    setErr(null);
    try {
      const res = await fetchProtected("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "OPERATIONAL_BASE" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j as { error?: string }));
      const url = readBillingPostUrl(j);
      if (!url) throw new Error("URL de ativação não disponível.");
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ativação indisponível");
    } finally {
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return <StateLoading message="A carregar contrato e uso…" className="min-h-[14rem]" />;
  }

  const evaluationStaleHint =
    sub && normalizePlan(sub.plan) === "FREE"
      ? freeEvaluationStaleMessage(sub.plan, sub.tenantCreatedAt ?? null)
      : null;

  return (
    <div className="min-w-0 space-y-8">
      {normalizePlan(sub?.plan ?? "") === "FREE" ? (
        <div
          className="df-feedback-info !rounded-xl px-4 py-3 text-sm"
          data-testid="settings-evaluation-mode-hint"
          role="status"
        >
          <p className="font-medium">Modo avaliação ativo</p>
          <p className="mt-1 text-xs leading-relaxed opacity-95">
            Limites da demonstração aplicam-se à conta. A operação completa é ativada com implantação e contrato.
          </p>
          {evaluationStaleHint ? <p className="df-text-warning mt-2 text-xs">{evaluationStaleHint}</p> : null}
        </div>
      ) : null}
      {err ? (
        <StateError
          title="Não foi possível carregar os dados"
          message={err}
          onRetry={() => {
            setLoading(true);
            void load();
          }}
        />
      ) : null}

      <section className="df-metric-card sm:p-6">
        <h2 className="mb-1 text-lg font-bold tracking-tight text-[var(--df-text-primary)]">Contrato ativo</h2>
        <p className="mb-3 text-sm text-[var(--df-text-secondary)]">
          Mensalidade, renovação e documentos de pagamento. Limites técnicos e regras da operação continuam definidos no
          servidor — aqui vê o estado e acede à área segura de pagamento.
        </p>
        {sub && (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--df-text-muted)]">Pacote</dt>
              <dd className="font-medium uppercase">{sub.plan}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--df-text-muted)]">Status</dt>
              <dd>{sub.status}</dd>
            </div>
            {sub.currentPeriodEnd && (
              <div className="flex justify-between">
                <dt className="text-[var(--df-text-muted)]">Fim do período</dt>
                <dd>{new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}</dd>
              </div>
            )}
            {sub.cancelAtPeriodEnd && (
              <p className="df-text-warning text-xs">Cancelamento agendado ao fim do período.</p>
            )}
            <div className="flex justify-between pt-2 border-t df-border-brand">
              <dt className="text-[var(--df-text-muted)]">Uso variável da operação</dt>
              <dd>{sub.meteredBillingConfigured ? "Ativo" : "Não configurado"}</dd>
            </div>
            {sub.lastInvoiceId && (
              <>
                <div className="flex justify-between">
                  <dt className="text-[var(--df-text-muted)]">Último documento</dt>
                  <dd className="text-xs font-mono truncate max-w-[180px]">{sub.lastInvoiceId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--df-text-muted)]">Status / pago</dt>
                  <dd>
                    {sub.lastInvoiceStatus}{" "}
                    {sub.lastInvoiceAmountPaid != null && (
                      <span className="text-[var(--df-text-secondary)]">
                        ({(sub.lastInvoiceAmountPaid / 100).toFixed(2)}{" "}
                        {sub.lastInvoiceAmountPaid > 0 ? "valor bruto reportado" : ""})
                      </span>
                    )}
                  </dd>
                </div>
              </>
            )}
          </dl>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {sub?.stripeCustomerId ? (
            <Button variant="secondary" type="button" onClick={() => void openPortal()} disabled={portalLoading}>
              {portalLoading ? "Abrindo…" : "Área de pagamentos e documentos"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => void checkoutOperational()}
            disabled={!!checkoutLoading}
          >
            {checkoutLoading === "OPERATIONAL_BASE" ? "…" : "Ativar operação contratada"}
          </Button>
        </div>
      </section>

      {usage &&
        (usage.allowsMeteredOverage !== false ? (
          <HowUsageWorksSection unitPrices={usage.unitPricesBrl} />
        ) : (
          <HowFreePlanWorksSection planKey={normalizePlan(sub?.plan ?? "FREE")} />
        ))}

      {usage && (
        <section className="df-metric-card sm:p-6">
          <h2 className="mb-1 text-lg font-bold tracking-tight text-[var(--df-text-primary)]">Uso do mês ({usage.period})</h2>
          <p className="text-xs text-[var(--df-text-muted)] mb-4">
            Custos variáveis são estimados com base nos preços configurados no servidor (env).
          </p>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between items-center">
              <dt>Volume de conversas (enviadas)</dt>
              <dd className="font-mono">
                {usage.messagesSent}
                {usage.limits.messagesPerMonth != null && (
                  <span className="text-[var(--df-text-muted)]"> / {usage.limits.messagesPerMonth}</span>
                )}
                {!usage.withinLimits.messages && (
                  <span className="df-text-warning ml-2 text-xs">no limite</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt>Respostas IA (automação)</dt>
              <dd className="font-mono">
                {usage.aiResponses}
                {usage.limits.aiResponsesPerMonth != null && (
                  <span className="text-[var(--df-text-muted)]"> / {usage.limits.aiResponsesPerMonth}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t df-border-brand pt-3 mt-2">
              <dt className="text-[var(--df-text-secondary)]">Preço unitário (ref.)</dt>
              <dd className="text-right text-xs text-[var(--df-text-secondary)]">
                msg R$ {usage.unitPricesBrl.message.toFixed(4)} · IA R${" "}
                {usage.unitPricesBrl.aiResponse.toFixed(4)}
              </dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Custo variável estimado (local)</dt>
              <dd className="df-text-success">
                R$ {usage.estimatedVariableCostBrl.toFixed(2)}
              </dd>
            </div>
            {usage.stripeMetered && sub?.meteredBillingConfigured && (
              <div className="border-t df-border-brand pt-3 mt-2 space-y-2">
                <p className="text-xs font-medium text-[var(--df-text-secondary)]">Uso adicional sincronizado</p>
                <div className="flex justify-between text-sm">
                  <dt>Conversas reportadas (uso adicional)</dt>
                  <dd className="font-mono">
                    {usage.stripeMetered.messagesReportedToStripe} / {usage.messagesSent}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt>IA reportada (uso adicional)</dt>
                  <dd className="font-mono">
                    {usage.stripeMetered.aiReportedToStripe} / {usage.aiResponses}
                  </dd>
                </div>
                {usage.stripeMetered.pendingStripeReports > 0 && (
                  <p className="df-text-warning text-xs">
                    {usage.stripeMetered.pendingStripeReports} evento(s) pendente(s) de sync — aguarde ou
                    rode o cron de retry.
                  </p>
                )}
              </div>
            )}
          </dl>
        </section>
      )}

      <p className="text-xs text-[var(--df-text-muted)]">
        Administradores: fluxo técnico de billing e enforcement está em{" "}
        <code className="rounded bg-[var(--df-bg-app)] px-1">docs/billing/BILLING_FLOW.md</code> — separado da narrativa de
        produto na interface.
      </p>
    </div>
  );
}
