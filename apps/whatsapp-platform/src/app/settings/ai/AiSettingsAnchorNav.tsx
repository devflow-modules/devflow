"use client";

import Link from "next/link";
import { AI_SETTINGS_SECTION_IDS } from "./aiSettingsAnchors";

const ITEMS: { id: string; label: string }[] = [
  { id: AI_SETTINGS_SECTION_IDS.visaoGeral, label: "Visão geral" },
  { id: AI_SETTINGS_SECTION_IDS.comportamento, label: "Comportamento" },
  { id: AI_SETTINGS_SECTION_IDS.automacao, label: "Automação" },
  { id: AI_SETTINGS_SECTION_IDS.limites, label: "Limites" },
  { id: AI_SETTINGS_SECTION_IDS.teste, label: "Teste" },
];

/**
 * Navegação interna por âncoras (scroll suave via CSS global `scroll-behavior: smooth`).
 */
export function AiSettingsAnchorNav() {
  return (
    <nav
      className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_52%,var(--df-bg-elevated))] px-3 py-2.5 text-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]"
      aria-label="Ir para secção"
    >
      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Ir para</span>
      <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1">
        {ITEMS.map((item, i) => (
          <span key={item.id} className="inline-flex items-center gap-1">
            {i > 0 ? <span className="text-[color-mix(in_srgb,var(--df-text-muted)_40%,transparent)]" aria-hidden>|</span> : null}
            <Link
              href={`/settings/ai#${item.id}`}
              className="font-medium text-[var(--df-brand-700)] hover:underline"
            >
              {item.label}
            </Link>
          </span>
        ))}
      </span>
    </nav>
  );
}
