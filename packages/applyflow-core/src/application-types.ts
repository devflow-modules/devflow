export type ApplyFlowApplicationStatus =
  | "reviewing"
  | "applied"
  | "ignored"
  | "waiting_response"
  | "interview"
  | "technical_test"
  | "rejected"
  | "accepted";

export type ApplyFlowJobMeta = {
  seniority?: string;
  roleType?: string;
  workModel?: string;
  contractType?: string;
  englishRequired?: boolean;
  detectedSkills?: string[];
  salaryMentioned?: boolean;
};

export type ApplyFlowApplication = {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: "linkedin";
  jobTitle?: string;
  companyName?: string;
  jobUrl?: string;
  status: ApplyFlowApplicationStatus;
  fitScore?: number;
  fieldsDetected?: number;
  fieldsFilled?: number;
  blockedCount?: number;
  failedCount?: number;
  notes?: string;
  jobMeta?: ApplyFlowJobMeta;
};

export type SaveApplicationInput = {
  source?: ApplyFlowApplication["source"];
  status?: ApplyFlowApplicationStatus;
  jobTitle?: string;
  companyName?: string;
  jobUrl?: string;
  fitScore?: number;
  fieldsDetected?: number;
  fieldsFilled?: number;
  blockedCount?: number;
  failedCount?: number;
  notes?: string;
  jobMeta?: ApplyFlowJobMeta;
};

export const APPLYFLOW_APPLICATION_STATUS_LABELS_PT: Record<ApplyFlowApplicationStatus, string> = {
  reviewing: "Revisando",
  applied: "Aplicada",
  ignored: "Ignorada",
  waiting_response: "Aguardando resposta",
  interview: "Entrevista",
  technical_test: "Teste técnico",
  rejected: "Recusada",
  accepted: "Aprovada",
};
