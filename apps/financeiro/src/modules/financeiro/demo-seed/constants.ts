/** Contas de demonstração — cenários: casal/casa, PJ, estúdio compartilhado */
export const DEMO_ACCOUNT_NAMES = ["Casa — casal", "PJ — operação", "Estúdio — compartilhado"] as const;

export type DemoAccountName = (typeof DEMO_ACCOUNT_NAMES)[number];

/** Fontes criadas pelo seed (nomes estáveis para reset idempotente) */
export const DEMO_SOURCE_NAMES = [
  "Demo — Salário PJ",
  "Demo — Notas e clientes",
  "Demo — Renda PF (casal)",
  "Demo — Caixa estúdio",
] as const;

/** Sufixo em categorias criadas pelo seed (facilita delete seletivo) */
export const DEMO_CATEGORY_MARKER = " · demo";

/** Prefixo de regras de demonstração */
export const DEMO_RULE_NAME_PREFIX = "Demo · ";

export const DEMO_INCOME_NOTES_TAG = "[demo financeiro]";

export const DEMO_GOAL_OBSERVATIONS_TAG = "[demo financeiro]";
