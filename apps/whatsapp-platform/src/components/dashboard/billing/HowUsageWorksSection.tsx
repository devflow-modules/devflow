"use client";

import {
  USAGE_AFTER_INCLUDED_EXPLAINER,
  USAGE_ANTI_SURPRISE_LINE,
  USAGE_EXPANSION_FRAMING,
  USAGE_EXPANSION_ONLY_IF_GROWTH,
  USAGE_NO_SERVICE_INTERRUPTION,
  formatExpansionUnitPriceLines,
  STRIPE_USAGE_LINE_LABELS,
} from "@/modules/billing/usageCommunication";

type Props = {
  unitPrices: { message: number; aiResponse: number };
  className?: string;
};

/**
 * Bloco educativo para planos pagos (STARTER / PRO / SCALE): incluído, expansão faturada e preços.
 * Plano FREE: usar `HowFreePlanWorksSection`.
 */
export function HowUsageWorksSection({ unitPrices, className = "" }: Props) {
  const priceLines = formatExpansionUnitPriceLines(unitPrices);

  return (
    <section
      className={`rounded-2xl border df-border-brand bg-gradient-to-b from-[var(--df-bg-app)] to-[var(--df-bg-elevated)] p-5 shadow-sm sm:p-6 ${className}`}
      aria-labelledby="how-usage-works-heading"
    >
      <h2 id="how-usage-works-heading" className="text-base font-semibold text-[var(--df-text-primary)]">
        Como funciona o uso
      </h2>
      <p className="mt-1 text-sm text-[var(--df-text-secondary)]">
        Cada plano inclui um volume de conversas e de interações de IA por mês. Isto é o pacote base da sua
        subscrição.
      </p>
      <ul className="mt-4 space-y-3 text-sm text-[var(--df-text-secondary)]">
        <li className="flex gap-2">
          <span className="mt-0.5 text-emerald-600" aria-hidden>
            ✓
          </span>
          <span>
            <strong className="text-[var(--df-text-primary)]">Incluído no plano:</strong> conversas e interações de IA até aos
            limites do nível que escolheu (ver tabela de planos).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 text-[var(--df-text-muted)]" aria-hidden>
            →
          </span>
          <span>
            <strong className="text-[var(--df-text-primary)]">Depois do incluído:</strong> {USAGE_AFTER_INCLUDED_EXPLAINER}{" "}
            {USAGE_NO_SERVICE_INTERRUPTION}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 text-[var(--df-text-muted)]" aria-hidden>
            ↑
          </span>
          <span>
            <strong className="text-[var(--df-text-primary)]">Expansão da operação:</strong> {USAGE_EXPANSION_FRAMING}
          </span>
        </li>
      </ul>

      <p className="mt-4 text-sm leading-relaxed text-[var(--df-text-secondary)]">{USAGE_EXPANSION_ONLY_IF_GROWTH}</p>

      <div className="mt-4 rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_58%,var(--df-bg-elevated))] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--df-text-primary)]">Preço de expansão</p>
        <ul className="mt-2 space-y-1.5 text-sm text-[var(--df-text-secondary)]">
          {priceLines.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="select-none text-[var(--df-text-muted)]" aria-hidden>
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-[var(--df-text-muted)]">
          Na fatura, estes valores aparecem como «{STRIPE_USAGE_LINE_LABELS.extraConversations}» e «
          {STRIPE_USAGE_LINE_LABELS.extraAi}», alinhados ao Stripe.
        </p>
      </div>

      <p className="mt-4 rounded-lg bg-emerald-50/80 px-3 py-2.5 text-sm leading-relaxed text-emerald-950/90">
        {USAGE_ANTI_SURPRISE_LINE}
      </p>
    </section>
  );
}
