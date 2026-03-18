/**
 * Estratégia de keywords para ranking TOP 3 — intent e prioridade.
 * Usado para alinhar títulos, descrições e clusters de conteúdo.
 */

export type KeywordIntent = "informational" | "commercial" | "comparison";

export type KeywordPriority = "high" | "medium";

export type Keyword = {
  keyword: string;
  intent: KeywordIntent;
  priority: KeywordPriority;
  /** Slug da página pilar ou principal que deve rankear */
  targetSlug?: string;
};

export const strategyKeywords: Keyword[] = [
  // Alta prioridade — controle financeiro
  {
    keyword: "controle financeiro",
    intent: "informational",
    priority: "high",
    targetSlug: "controle-financeiro-completo",
  },
  {
    keyword: "controle financeiro pessoal",
    intent: "informational",
    priority: "high",
    targetSlug: "controle-financeiro-completo",
  },
  {
    keyword: "como organizar finanças",
    intent: "informational",
    priority: "high",
    targetSlug: "como-organizar-financas-pessoais",
  },
  {
    keyword: "como organizar finanças pessoais",
    intent: "informational",
    priority: "high",
    targetSlug: "como-organizar-financas-pessoais",
  },
  {
    keyword: "melhor app financeiro",
    intent: "commercial",
    priority: "high",
    targetSlug: "melhor-app-para-controlar-financas",
  },
  {
    keyword: "melhor app para controlar finanças",
    intent: "commercial",
    priority: "high",
    targetSlug: "melhor-app-para-controlar-financas",
  },
  {
    keyword: "planilha vs app financeiro",
    intent: "comparison",
    priority: "high",
    targetSlug: "planilha-vs-app-financeiro",
  },
  {
    keyword: "dividir contas",
    intent: "informational",
    priority: "high",
    targetSlug: "dividir-conta-casal",
  },
  {
    keyword: "dividir conta casal",
    intent: "informational",
    priority: "high",
    targetSlug: "dividir-conta-casal",
  },
  // Média prioridade — clusters
  {
    keyword: "como controlar gastos mensais",
    intent: "informational",
    priority: "medium",
    targetSlug: "como-controlar-gastos-mensais",
  },
  {
    keyword: "app controle financeiro grátis",
    intent: "commercial",
    priority: "medium",
    targetSlug: "melhor-app-para-controlar-financas",
  },
  {
    keyword: "organizar finanças pessoais",
    intent: "informational",
    priority: "medium",
    targetSlug: "como-organizar-financas-pessoais",
  },
  {
    keyword: "rateio proporcional renda",
    intent: "informational",
    priority: "medium",
    targetSlug: "rateio-proporcional-renda",
  },
  {
    keyword: "consultar cnpj grátis",
    intent: "commercial",
    priority: "medium",
    targetSlug: "consultar-cnpj-online-gratis",
  },
];

/** Keywords de alta prioridade para foco em conteúdo e CTR. */
export const highPriorityKeywords = strategyKeywords.filter((k) => k.priority === "high");

/** Slugs de páginas pilares (guias completos que concentram autoridade). */
export const pillarSlugs = [
  "controle-financeiro-completo",
  "como-organizar-financas-pessoais",
  "melhor-app-para-controlar-financas",
] as const;

export type PillarSlug = (typeof pillarSlugs)[number];
