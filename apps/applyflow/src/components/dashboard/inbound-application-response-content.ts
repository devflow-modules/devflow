/** Optional section label — keep empty so internal sprint codes never appear in the UI. */
export const INBOUND_RESPONSE_EYEBROW = "";
export const INBOUND_RESPONSE_TITLE = "Respostas de e-mail";
export const INBOUND_RESPONSE_DESCRIPTION =
  "Isto é uma sugestão. O status da candidatura ainda não foi alterado. Confirme, corrija ou ignore. O ApplyFlow não responde a e-mails.";
export const INBOUND_RESPONSE_NO_AUTO =
  "Detecção não é confirmação. Nenhuma mensagem altera o ciclo sozinha.";
export const INBOUND_RESPONSE_DOMAIN_LABEL = "Domínio do remetente";
export const INBOUND_RESPONSE_SUBJECT_LABEL = "Assunto ou snippet (opcional, só neste navegador)";
export const INBOUND_RESPONSE_CLASSIFY_LABEL = "Classificar resposta";
export const INBOUND_RESPONSE_SCAN_GMAIL_LABEL = "Ler Gmail (só leitura)";
export const INBOUND_RESPONSE_CONFIRM_LABEL = "Confirmar";
export const INBOUND_RESPONSE_DISMISS_LABEL = "Ignorar";
export const INBOUND_RESPONSE_STATUS_LABEL = "Etapa sugerida";
export const INBOUND_RESPONSE_APPLICATION_LABEL = "Candidatura";
export const INBOUND_RESPONSE_EMPTY =
  "Ainda não há detecções. Cole o domínio de um e-mail recebido ou execute a leitura só de metadados do Gmail.";
export const INBOUND_RESPONSE_EMPTY_NO_APPLIED =
  "Só candidaturas já enviadas entram neste passo. Confirme o envio antes de classificar uma resposta.";
export const INBOUND_RESPONSE_EVIDENCE_LABEL = "Evidências";
export const INBOUND_RESPONSE_CONFIDENCE_LABEL = "Confiança";
export const INBOUND_RESPONSE_MATCH_LABEL = "Correspondência";
export const INBOUND_RESPONSE_CLASSIFICATION_LABEL = "Classificação";
export const INBOUND_RESPONSE_GMAIL_HINT =
  "A leitura do Gmail reutiliza a conexão existente, lê só o assunto em metadados e não marca, arquiva nem responde.";
export const INBOUND_RESPONSE_CONFIRMED_PREFIX = "Confirmado — candidatura atualizada para";
export const INBOUND_RESPONSE_CONFIRMED_NOTE = "Confirmado — registrado no histórico, sem mudança de etapa.";
export const INBOUND_RESPONSE_NEED_APPLICATION = "Escolha a candidatura antes de confirmar.";
export const INBOUND_RESPONSE_V2_CONFIRM_BLOCKED =
  "A confirmação de respostas ainda não está disponível com a persistência da conta. A candidatura não foi alterada.";
export const INBOUND_RESPONSE_DISMISSED_HINT = "Detecção ignorada. A candidatura não foi alterada.";
export const INBOUND_RESPONSE_LOCAL_ONLY = "O assunto cola-se só para classificar agora. Não fica no armazenamento.";
export const INBOUND_RESPONSE_PENDING_BADGE = "Pendente de revisão";
export const INBOUND_RESPONSE_UNMATCHED = "Sem candidatura correspondente";
export const INBOUND_RESPONSE_AMBIGUOUS = "Ambígua — escolha a vaga";
export const INBOUND_RESPONSE_SCAN_BLOCKED =
  "Leitura do Gmail bloqueada. Confirme o consentimento e a conexão; você ainda pode classificar localmente.";
export const INBOUND_RESPONSE_SCAN_DISABLED =
  "Leitura do Gmail desligada neste ambiente. Classifique localmente pelo domínio; o servidor não inicia OAuth nem varredura.";
export const INBOUND_RESPONSE_ACCOUNT_LABEL = "Conta Gmail alvo";
export const INBOUND_RESPONSE_NEED_ACCOUNT =
  "Selecione a conta Gmail a ler. O ApplyFlow não mistura caixas no mesmo painel.";
export const INBOUND_RESPONSE_BIND_LEGACY_LABEL = "Esta é a conta Gmail original";
export const INBOUND_RESPONSE_BIND_LEGACY_HINT =
  "Há detecções anteriores sem conta associada. Não foram reutilizadas. Só associe o legado se confirmar que esta é a caixa original.";
export const INBOUND_RESPONSE_BIND_LEGACY_DONE =
  "Legado associado a esta conta Gmail. As detecções existentes não foram reclassificadas.";
export const INBOUND_RESPONSE_SECONDARY_SUMMARY = "Classificar respostas de e-mail (opcional)";

export function formatInboundAccountLabel(scope: string, index: number): string {
  return `Conta Gmail ${index + 1} · ${scope.slice(0, 8)}`;
}

export function formatInboundAnalysisNotice(summary: {
  analyzedCount: number;
  discardedCount: number;
  detectionsCreated: number;
  detectionsReused: number;
}): string {
  return `Analisadas ${summary.analyzedCount}. Descartadas ${summary.discardedCount}. Novas detecções ${summary.detectionsCreated}. Já existentes ${summary.detectionsReused}.`;
}

export const INBOUND_RESPONSE_CONFIDENCE_LABELS = {
  high: "alta",
  medium: "média",
  low: "baixa",
} as const;

export const INBOUND_RESPONSE_MATCH_STATUS_LABELS = {
  matched: "associada",
  ambiguous: "ambígua",
  unmatched: "sem correspondência",
} as const;
