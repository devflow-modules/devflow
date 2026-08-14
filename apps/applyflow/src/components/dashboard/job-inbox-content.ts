import type { JobMatchDecision } from "@devflow/applyflow-core";
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
