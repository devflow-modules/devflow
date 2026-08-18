import type { CurriculumRecommendation, JobMatchDecision } from "@devflow/applyflow-core";
import type { ApplyFlowBadgeTone } from "@/components/ui/ApplyFlowBadge";

export const JOB_INBOX_EYEBROW = "AF-JOBS-F1";
export const JOB_INBOX_TITLE = "Inbox de vagas";
export const JOB_INBOX_DESCRIPTION =
  "Cola o texto da vaga ou importa JSON v2. O score é determinístico, sem LLM e sem ir à rede. APPLY e STRETCH entram como Revisando; SKIP como Ignorada. O anúncio completo não é guardado — só um recorte truncado e um hash local.";
export const JOB_INBOX_SUBMIT_LABEL = "Avaliar vaga";
export const JOB_INBOX_PASTE_LABEL = "Texto da vaga";
export const JOB_INBOX_TITLE_LABEL = "Título (opcional)";
export const JOB_INBOX_COMPANY_LABEL = "Empresa (opcional)";
export const JOB_INBOX_URL_LABEL = "URL (opcional, não é descarregada)";
export const JOB_INBOX_EVALUATED_WITH_PREFIX = "Avaliado com:";
export const JOB_INBOX_MATCHED_WITH_PREFIX = "Match com";
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
  "Isto é um pacote de preparação local. Não envia a candidatura por ti.";
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

export const JOB_MATCH_DECISION_LABELS: Record<JobMatchDecision, string> = {
  apply: "APPLY",
  stretch: "STRETCH",
  skip: "SKIP",
};

export function jobMatchDecisionTone(decision: JobMatchDecision): ApplyFlowBadgeTone {
  if (decision === "apply") return "success";
  if (decision === "stretch") return "warning";
  return "danger";
}

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
