/** Curated excerpt — ANPD small-agent security guidance (privacy minimization for pilots). */
export const ANPD_PRIVACY_SOURCE = {
  id: "anpd-small-agent-security",
  version: "2026-06-22",
  title: "ANPD — Guia de Segurança da Informação para Agentes de Tratamento de Pequeno Porte",
  url: "https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-guia-de-seguranca-para-agentes-de-tratamento-de-pequeno-porte",
  principles: [
    "Adopt security measures proportionate to personal data processing risk.",
    "Minimize collection and retention — collect only what is necessary.",
    "Anonymize or pseudonymize research notes before wider sharing.",
    "Avoid unnecessary persistence of résumé, job posting or contact details.",
    "Require explicit consent before recording or retaining identifiable artefacts.",
  ],
  pilotRules: [
    "Do not store full résumé or job description in GitHub, logs or issue comments.",
    "Replace identifiable entities with neutral categories in public outputs.",
    "Delete session artefacts after anonymized synthesis unless consent says otherwise.",
  ],
} as const;
