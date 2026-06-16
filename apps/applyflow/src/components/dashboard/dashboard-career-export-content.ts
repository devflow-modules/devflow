export const DASHBOARD_CAREER_EXPORT_SOURCE_LABELS = {
  none: "Sem enrichment",
  demo: "Demonstrativo",
  "provider-derived-proposal": "Provider-derived",
} as const;

export const DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS = {
  none: "Nenhum enrichment está incluído na composição atual.",
  demo: "Dados de enrichment usados apenas para demonstração.",
  "provider-derived-proposal": "Dados derivados dos sinais revisados nesta sessão.",
} as const;

export const DASHBOARD_CAREER_EXPORT_COMPOSITION_TRANSIENT_NOTICE =
  "A composição é temporária e usada apenas para prévia, handoff e exportação explícita. Nenhuma alteração foi aplicada ao perfil. Nenhuma candidatura foi modificada.";

/** @deprecated Use deriveExportCompositionSourceViewModel for UI copy. */
export const DASHBOARD_CAREER_EXPORT_ENRICHMENT_SOURCE_NONE =
  DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS.none;

/** @deprecated Use deriveExportCompositionSourceViewModel for UI copy. */
export const DASHBOARD_CAREER_EXPORT_ENRICHMENT_SOURCE_DEMO =
  DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS.demo;

/** @deprecated Use deriveExportCompositionSourceViewModel for UI copy. */
export const DASHBOARD_CAREER_EXPORT_ENRICHMENT_SOURCE_PROVIDER_DERIVED =
  DASHBOARD_CAREER_EXPORT_SOURCE_DESCRIPTIONS["provider-derived-proposal"];

export const DASHBOARD_CAREER_EXPORT_READ_ONLY_NOTICE =
  "Nada foi aplicado ao perfil ou às candidaturas. A exportação ocorre somente pelas ações explícitas abaixo.";
