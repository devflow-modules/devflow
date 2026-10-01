import type { CurriculumRecommendation, JobMatchDecision } from "@devflow/applyflow-core";

export const JOB_INBOX_EYEBROW = "AF-JOBS-F1";
export const JOB_INBOX_TITLE = "Vagas";
export const JOB_INBOX_DESCRIPTION =
  "Procura oportunidades ou cola um anúncio. A avaliação é local e não envia a candidatura.";
export const JOB_DISCOVERY_TITLE = "Procurar oportunidades";
export const JOB_DISCOVERY_DESCRIPTION =
  "Escolhe uma fonte e busca. O currículo não sai do browser. Um resultado só entra na inbox quando escolhes guardar.";
export const JOB_DISCOVERY_ADVANCED_FILTERS = "Mais filtros";
export const JOB_DISCOVERY_ADVANCED_FILTERS_HIDE = "Ocultar filtros";
export const JOB_DISCOVERY_PASTE_TOGGLE = "Colar anúncio manualmente";
export const JOB_DISCOVERY_PASTE_TOGGLE_HINT =
  "Use quando a fonte não traz descrição ou quiser avaliar um anúncio copiado.";
export const JOB_DISCOVERY_PROVIDER = "Fonte";
export const JOB_DISCOVERY_PROVIDER_JOBGETHER = "Jobgether";
export const JOB_DISCOVERY_PROVIDER_JOBGETHER_HINT = "Busca rápida";
export const JOB_DISCOVERY_PROVIDER_THEIRSTACK = "TheirStack";
export const JOB_DISCOVERY_PROVIDER_THEIRSTACK_HINT = "Descrição completa para análise";
export const JOB_DISCOVERY_PROVIDER_REMOTEOK = "Remote OK";
export const JOB_DISCOVERY_PROVIDER_REMOTEOK_HINT = "Vagas remotas de tecnologia";
export const JOB_DISCOVERY_THEIRSTACK_NOTE = "Resultados completos para análise";
export const JOB_DISCOVERY_REMOTEOK_NOTE =
  "Vagas remotas de tecnologia. Restrições geográficas usam Localização. Remoto não significa mundial.";
export const JOB_DISCOVERY_REMOTEOK_UNSUPPORTED_FILTERS =
  "Com Remote OK, salário e tipo de contrato não estão disponíveis nesta fonte.";
export const JOB_DISCOVERY_KEYWORD = "Palavra-chave";
export const JOB_DISCOVERY_LOCATION = "Localização";
export const JOB_DISCOVERY_EXPERIENCE = "Experiência";
export const JOB_DISCOVERY_REMOTE = "Remoto";
export const JOB_DISCOVERY_CONTRACT = "Contrato";
export const JOB_DISCOVERY_SALARY_MIN = "Salário mínimo";
export const JOB_DISCOVERY_SALARY_MAX = "Salário máximo";
export const JOB_DISCOVERY_CURRENCY = "Moeda";
export const JOB_DISCOVERY_SORT = "Ordenação";
export const JOB_DISCOVERY_SEARCH = "Buscar";
export const JOB_DISCOVERY_LOADING = "Buscando…";
export const JOB_DISCOVERY_LOAD_MORE = "Carregar mais";
export const JOB_DISCOVERY_EMPTY = "Nenhuma oportunidade com estes filtros.";
/** Default badge copy for Jobgether hits (legacy constant used by tests). */
export const JOB_DISCOVERY_SOURCE = "Fonte: Jobgether";
export const JOB_DISCOVERY_SOURCE_THEIRSTACK = "Fonte: TheirStack";
export const JOB_DISCOVERY_SOURCE_REMOTEOK = "Fonte: Remote OK";
export const JOB_DISCOVERY_VIEW_LISTING = "Ver anúncio no Jobgether";
export const JOB_DISCOVERY_VIEW_LISTING_GENERIC = "Ver anúncio";
export const JOB_DISCOVERY_VIEW_LISTING_REMOTEOK = "Ver anúncio no Remote OK";
export const JOB_DISCOVERY_DIRECT_APPLY = "Candidatura direta";
export const JOB_DISCOVERY_SAVE = "Guardar e analisar";
export const JOB_DISCOVERY_ADD_DESCRIPTION = "Adicionar descrição";
export const JOB_DISCOVERY_PREVIEW_ANALYZE = "Analisar compatibilidade";
export const JOB_DISCOVERY_DESCRIPTION_LABEL = "Descrição da vaga";
export const JOB_DISCOVERY_DESCRIPTION_HINT =
  "Abre o anúncio, copia o texto completo e cola aqui. O ApplyFlow não descarrega a página.";
export const JOB_DISCOVERY_DESCRIPTION_EMPTY = "Cola a descrição da vaga para analisar.";
export const JOB_DISCOVERY_ANALYZE = "Analisar vaga";
export const JOB_DISCOVERY_CANCEL = "Cancelar";
export const JOB_DISCOVERY_SAVED = "Guardada na inbox.";
export const JOB_DISCOVERY_DUPLICATE = "Esta vaga já está na inbox.";
export const JOB_DISCOVERY_MISSING_DESCRIPTION =
  "A fonte não enviou a descrição desta vaga. Cola o texto para ver a aderência e, se quiseres, guarda depois.";
export const JOB_DISCOVERY_PREVIEW_SCORE_SUFFIX = "% de aderência";
export const JOB_DISCOVERY_PREVIEW_MATCHED = "Compatíveis";
export const JOB_DISCOVERY_PREVIEW_MISSING = "Lacunas";
export const JOB_DISCOVERY_PREVIEW_UNKNOWN = "Não informado";
export const JOB_DISCOVERY_PREVIEW_NEEDS_DESCRIPTION = "Descrição necessária para analisar";
export const JOB_DISCOVERY_PREVIEW_ERROR = "Não foi possível calcular a aderência desta vaga.";
export const JOB_DISCOVERY_PREVIEW_SORT = "Ordenar resultados";
export const JOB_DISCOVERY_PREVIEW_SORT_DEFAULT = "Ordem da busca";
export const JOB_DISCOVERY_PREVIEW_SORT_MATCH = "Maior aderência";
export const JOB_DISCOVERY_PREVIEW_SORT_HINT = "Ordena apenas os resultados carregados.";
export const JOB_DISCOVERY_SAVE_ERROR = "Não foi possível guardar esta vaga.";
export const JOB_DISCOVERY_ANY = "Qualquer";
export const JOB_DISCOVERY_PASTE_HEADING = "Colar anúncio";

export const JOB_DISCOVERY_ERROR_MESSAGES: Record<string, string> = {
  invalid_criteria: "Ajusta os filtros e tenta de novo.",
  provider_rejected: "A fonte recusou estes filtros.",
  provider_timeout: "A fonte demorou demais. Tenta de novo.",
  provider_rate_limited: "A fonte limitou as consultas. Espera alguns minutos.",
  app_rate_limited: "Limite temporário de buscas desta fonte atingido.",
  auth_required: "Faça login para pesquisar esta fonte.",
  provider_unavailable: "A fonte está indisponível.",
  provider_not_configured: "Esta fonte não está disponível neste ambiente.",
  provider_not_available: "Esta fonte paga não está disponível neste ambiente.",
  invalid_provider_response: "A fonte devolveu uma resposta que não foi aceite.",
};
export const JOB_INBOX_SUBMIT_LABEL = "Avaliar vaga";
export const JOB_INBOX_NEEDS_RESUME =
  "Job Match precisa de um currículo válido. Cadastra um perfil ou importa JSON primeiro.";
export const JOB_INBOX_PASTE_LABEL = "Texto da vaga";
export const JOB_INBOX_TITLE_LABEL = "Título (opcional)";
export const JOB_INBOX_COMPANY_LABEL = "Empresa (opcional)";
export const JOB_INBOX_URL_LABEL = "URL (opcional, não é descarregada)";
export const JOB_INBOX_DUPLICATE_URL = "Esta URL já está cadastrada. A vaga existente não foi sobrescrita.";
export const JOB_INBOX_OPEN_EXISTING = "Abrir vaga existente";
export const JOB_INBOX_EVALUATED_WITH_PREFIX = "Avaliado com:";
export const JOB_INBOX_MATCHED_WITH_PREFIX = "Match com";
export { JOB_DECISION_V2_LINK } from "./job-decision-v2-content";
export const CURRICULUM_ROUTER_TITLE = "Currículo recomendado";
export const CURRICULUM_ROUTER_EQUIVALENT_TITLE = "Currículos com aderência semelhante";
export const CURRICULUM_ROUTER_COMPARE_LABEL = "Comparar currículos";
export const CURRICULUM_ROUTER_SKIP_HINT =
  "A decisão desta vaga é SKIP. A comparação de currículos não muda isso e não aplica por ti.";
export const CURRICULUM_ROUTER_NOT_AN_ACTION = "Isto é uma recomendação. O currículo padrão não é alterado.";
export const CURRICULUM_ROUTER_EQUIVALENT_HINT =
  "Os dois currículos têm aderência semelhante. O primeiro aparece ligeiramente à frente.";

export const APPLICATION_PACK_PREPARE_LABEL = "Preparar candidatura";
export const APPLICATION_PACK_OPEN_LABEL = "Candidatura preparada";
export const APPLICATION_PACK_TITLE = "Candidatura preparada";
export const APPLICATION_PACK_HINT =
  "Pacote de preparação local (checklist e currículo). Não cria candidatura e não envia nada ao empregador.";
export const APPLICATION_PACK_RESUME_LABEL = "Currículo";
export const APPLICATION_PACK_SELECT_LABEL = "Currículo para esta candidatura";
export const APPLICATION_PACK_ROUTER_HINT = "Recomendado pelo Router";
export const APPLICATION_PACK_FIT_LABEL = "Fit";
export const APPLICATION_PACK_HIGHLIGHTS_LABEL = "Pontos para destacar";
export const APPLICATION_PACK_GAPS_LABEL = "Gaps para revisar";
export const APPLICATION_PACK_FACTS_LABEL = "Dados rápidos";
export const APPLICATION_PACK_ANSWERS_LABEL = "Respostas-base do perfil";
export const APPLICATION_PACK_ANSWERS_HINT =
  "Textos já guardados no perfil. Não foram gerados nem adaptados a esta vaga.";
export const APPLICATION_PACK_CHECKLIST_LABEL = "Checklist";
export const APPLICATION_PACK_OPEN_JOB_LABEL = "Abrir vaga";
export const APPLICATION_PACK_MARK_APPLIED_LABEL = "Marcar como aplicada";
export const APPLICATION_PACK_CHECKLIST_LABELS = {
  "review-resume": "Revisar currículo selecionado",
  "review-highlights": "Revisar pontos fortes",
  "review-gaps": "Revisar gaps",
  "review-answers": "Revisar respostas da candidatura",
  "open-job": "Abrir página da vaga",
  "mark-applied": "Marcar candidatura como aplicada",
} as const;
export const APPLICATION_PACK_ANSWER_LABELS = {
  professionalSummary: "Resumo profissional",
  tellUsAboutYourself: "Fala sobre ti",
  whyGoodFit: "Por que és um bom fit",
  availability: "Disponibilidade",
} as const;
export const APPLICATION_PACK_SALARY_LABELS = {
  cltPleno: "CLT pleno",
  cltSenior: "CLT sénior",
  pjSenior: "PJ sénior",
  usdMonthly: "USD mensal",
  usdHourly: "USD hora",
} as const;

export const JOB_INBOX_STALE_LABEL = "Avaliação desatualizada";
export const JOB_INBOX_REEVALUATE_LABEL = "Reavaliar match";
export const JOB_INBOX_INCOMPLETE_HINT = "Complete seu perfil para concluir a análise";
export const JOB_INBOX_AT_APPLY_ANALYSIS = "Análise no envio";
export const JOB_INBOX_CURRENT_ANALYSIS = "Análise atual";

export const JOB_QUEUE_VIEW_LABEL = "Fila de oportunidades";
export const JOB_QUEUE_VIEW_ACTIVE = "Fila ativa";
export const JOB_QUEUE_VIEW_ALL = "Todas";
export const JOB_QUEUE_VIEW_IGNORED = "Ignoradas";
export const JOB_QUEUE_SORT_LABEL = "Ordenar";
export const JOB_QUEUE_SORT_MATCH = "Maior aderência";
export const JOB_QUEUE_SORT_RECENCY = "Mais recentes";
export const JOB_QUEUE_FILTER_DECISION = "Recomendação";
export const JOB_QUEUE_FILTER_SOURCE = "Fonte";
export const JOB_QUEUE_FILTER_ALL = "Todas";
export const JOB_QUEUE_EMPTY_ACTIVE = "Nenhuma vaga na fila ativa. Guarda uma oportunidade a partir da busca ou do anúncio colado.";
export const JOB_QUEUE_EMPTY_IGNORED = "Nenhuma vaga ignorada.";
export const JOB_QUEUE_EMPTY_FILTERED = "Nenhuma vaga com estes filtros.";
export const JOB_QUEUE_IGNORE_LABEL = "Ignorar";
export const JOB_QUEUE_RESTORE_LABEL = "Voltar à fila";
export const JOB_QUEUE_OPEN_SOURCE_LABEL = "Abrir anúncio";
export const JOB_QUEUE_HISTORICAL_NOTE =
  "Vagas ignoradas antigas (antes da fila) permanecem em Ignoradas até as restaurares.";

export const JOB_QUEUE_SOURCE_LABELS: Record<string, string> = {
  jobgether: "Jobgether",
  theirstack: "TheirStack",
  remoteok: "Remote OK",
  paste: "Colado",
  linkedin: "LinkedIn",
  json: "JSON",
};

export const JOB_MATCH_DECISION_LABELS: Record<JobMatchDecision, string> = {
  apply: "APPLY",
  stretch: "STRETCH",
  needs_info: "INCONCLUSIVA",
  skip: "SKIP",
};

export { matchDecisionTone as jobMatchDecisionTone } from "@/components/ui/status-tones";

export function curriculumRouterHeading(recommendation: CurriculumRecommendation): string {
  return recommendation.confidence === "equivalent" ? CURRICULUM_ROUTER_EQUIVALENT_TITLE : CURRICULUM_ROUTER_TITLE;
}

export function curriculumRouterAdvantageLabel(recommendation: CurriculumRecommendation): string | null {
  if (!recommendation.runnerUpVariantName) return null;
  if (recommendation.confidence === "equivalent") return null;
  const prefix = recommendation.confidence === "clear" ? "Vantagem" : "Vantagem moderada";
  return `${prefix}: +${recommendation.scoreDelta} sobre ${recommendation.runnerUpVariantName}`;
}

export function curriculumRouterDivergenceLabel(input: {
  evaluatedWithName: string;
  evaluatedWithId: string;
  recommendation: CurriculumRecommendation;
}): string | null {
  if (input.evaluatedWithId === input.recommendation.recommendedVariantId) return null;
  const recommended = input.recommendation.candidates.find(
    (candidate) => candidate.variantId === input.recommendation.recommendedVariantId,
  );
  if (!recommended) return null;
  return `O score da vaga usa ${input.evaluatedWithName} (padrão na avaliação). Com ${recommended.variantName} o match seria ${JOB_MATCH_DECISION_LABELS[recommended.decision]} ${recommended.score}/100.`;
}
