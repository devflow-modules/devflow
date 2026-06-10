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
 * Bloco educativo para contratos com expansão de uso: incluído, uso adicional e referência de preço.
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
        O contrato inclui um volume de conversas e de interações de IA por mês. Isto é o pacote base da operação
        contratada.
      </p>
      <ul className="mt-4 space-y-3 text-sm text-[var(--df-text-secondary)]">
        <li className="flex gap-2">
          <span className="mt-0.5 df-list-check-success" aria-hidden>
            ✓
          </span>
          <span>
            <strong className="text-[var(--df-text-primary)]">Incluído no contrato:</strong> conversas e interações de IA até aos
            limites acordados (detalhe em Contrato e uso).
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
          No extrato do período, estes valores aparecem como «{STRIPE_USAGE_LINE_LABELS.extraConversations}» e «
          {STRIPE_USAGE_LINE_LABELS.extraAi}».
        </p>
      </div>

      <p className="df-feedback-info mt-4 text-sm leading-relaxed">
        {USAGE_ANTI_SURPRISE_LINE}
      </p>
    </section>
  );
}
