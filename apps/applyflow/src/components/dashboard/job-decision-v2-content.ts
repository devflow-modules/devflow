import type { ApplicationDecisionSnapshot } from "@devflow/applyflow-core";

export const JOB_DECISION_V2_EYEBROW = "AF-COS-P1";
export const JOB_DECISION_V2_TITLE = "Análise da vaga";
export const JOB_DECISION_V2_HINT =
  "Análise local da vaga. Não envia a candidatura e não chama rede.";
export const JOB_DECISION_V2_CURRENT_ANALYSIS = "Análise atual";
export const JOB_DECISION_V2_AT_APPLY_ANALYSIS = "Análise no envio";
export const JOB_DECISION_V2_CURRENT_HINT =
  "Recalculada com o currículo atual deste browser. Não substitui a análise registrada na candidatura.";
export const JOB_DECISION_V2_REGISTERED_PRESERVED =
  "A análise registrada na candidatura foi preservada.";
export const JOB_DECISION_V2_HISTORY = "Histórico da candidatura";
export const JOB_DECISION_V2_STATUS = "Estado";
export const JOB_DECISION_V2_HIRED = "Hired";
export const JOB_DECISION_V2_BACK = "Voltar ao dashboard";
export const JOB_DECISION_V2_MISSING = "Esta vaga não está no armazenamento local deste browser.";
export const JOB_DECISION_V2_NO_TEXT =
  "Sem texto da vaga não há requisitos V2. Cola o anúncio na inbox e avalia de novo.";
export const JOB_DECISION_V2_LINK = "Analisar vaga";
export const JOB_DECISION_V2_INPUTS = "Perguntas pendentes";
export const JOB_DECISION_V2_INPUTS_HINT =
  "Orientação apenas — esta tela não grava respostas. Atualiza o currículo no dashboard se quiseres fechar um UNKNOWN.";
export const JOB_DECISION_V2_NEED_RESUME =
  "A análise precisa de um currículo válido. Cadastra ou define um currículo padrão antes de continuar.";
export const JOB_DECISION_V2_LAB_HANDOFF =
  "Este link só abre o Interview Lab. Não transfere o Application Pack. Exporta o CareerBundle no dashboard se quiseres levar o histórico.";
export const JOB_DECISION_V2_GATES = "Gates";
export const JOB_DECISION_V2_REQUIREMENTS = "Requisitos × evidência";
export const JOB_DECISION_V2_DIMENSIONS = "Dimensões";
export const JOB_DECISION_V2_CLAIMS = "Claims recomendadas";
export const JOB_DECISION_V2_TABS = {
  overview: "Overview",
  requirements: "Requirements",
  evidence: "Evidence",
  application: "Application",
  networking: "Networking",
  interview: "Interview",
} as const;
export const JOB_DECISION_V2_PACK_BLOCKED = "Pack bloqueado — SKIP não gera candidatura recomendada.";
export const JOB_DECISION_V2_INCOMPLETE = "Complete seu perfil para concluir a análise";
export const JOB_DECISION_V2_PACK_INCOMPLETE =
  "Pack bloqueado — complete o perfil antes de preparar a candidatura.";
export const JOB_DECISION_V2_NO_SEND = "Nenhum envio automático. Copie e use os rascunhos manualmente.";
export const JOB_DECISION_V2_OPEN_LAB = "Abrir Interview Lab";
export const JOB_DECISION_V2_NEED_APPLICATION =
  "O resultado pertence à candidatura, não à vaga. Regista a candidatura antes de gravar o que aconteceu.";
export const JOB_DECISION_V2_CREATE_APPLICATION = "Registrar candidatura";
export const JOB_DECISION_V2_CREATE_HINT =
  "Isto grava a candidatura neste browser e congela a análise (currículo, requisitos e evidências). Não envia nada ao empregador.";
export const JOB_DECISION_V2_APPLICATION_READY =
  "Candidatura registada neste browser. A análise registrada ficou fixa e não muda se alterares o currículo.";
export const JOB_DECISION_V2_MARK_SENT = "Marcar como enviada";
export const JOB_DECISION_V2_MARK_SENT_HINT =
  "Usa isto depois de enviares tu ao empregador. Actualiza o estágio desta candidatura. Não cria outro registo e não mexe na análise congelada.";
export const JOB_DECISION_V2_MARKED_SENT = "Candidatura marcada como enviada neste browser.";

export const JOB_DECISION_V2_GATE_RESULT_LABELS = {
  pass: "pass",
  fail: "fail",
  unknown: "unknown",
  not_applicable: "n/a",
} as const;

export const JOB_DECISION_V2_LABELS = {
  apply_high: "APPLY HIGH",
  apply_normal: "APPLY NORMAL",
  apply_stretch: "APPLY STRETCH",
  needs_info: "INCONCLUSIVA",
  skip: "SKIP",
} as const;

export function analysesDivergeOnPage(
  registered: { overallFit: number; decision: string } | null,
  current: { overall: number; decision: string } | null,
): boolean {
  if (!registered || !current) return false;
  return registered.overallFit !== current.overall || registered.decision !== current.decision;
}

/** Reads historical scores only from the stored snapshot. Does not use the live profile. */
export function registeredAnalysisFromSnapshot(snapshot: ApplicationDecisionSnapshot | null | undefined) {
  if (!snapshot) return null;
  return {
    overallFit: snapshot.overallFit,
    decision: snapshot.decision,
    dimensions: snapshot.dimensions,
    requirements: snapshot.requirements,
    capturedAt: snapshot.capturedAt,
  };
}
