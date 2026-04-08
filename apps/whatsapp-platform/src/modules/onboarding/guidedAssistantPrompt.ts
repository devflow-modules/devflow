/**
 * Geração determinística de instruções iniciais do assistente (tenant defaultPrompt / systemPrompt).
 * Sem LLM — apenas templates a partir de escolhas guiadas.
 */

export const GUIDED_SEGMENTS = [
  { id: "retail", label: "Comércio / loja física ou online" },
  { id: "services", label: "Serviços profissionais" },
  { id: "health", label: "Saúde e bem-estar" },
  { id: "food", label: "Restauração ou delivery" },
  { id: "other", label: "Outro segmento" },
] as const;

export const GUIDED_OBJECTIVES = [
  { id: "support_sales", label: "Atender dúvidas e apoiar vendas" },
  { id: "support_only", label: "Apenas suporte a clientes que já compraram" },
  { id: "lead_qualification", label: "Qualificar contactos e leads" },
  { id: "appointments", label: "Marcações e agendamentos" },
  { id: "other", label: "Outro objetivo principal" },
] as const;

export const GUIDED_TONES = [
  { id: "formal", label: "Formal e respeitoso" },
  { id: "friendly", label: "Amigável e próximo" },
  { id: "objective", label: "Direto e objetivo" },
  { id: "enthusiastic", label: "Entusiasta e motivador" },
] as const;

export type GuidedSegmentId = (typeof GUIDED_SEGMENTS)[number]["id"];
export type GuidedObjectiveId = (typeof GUIDED_OBJECTIVES)[number]["id"];
export type GuidedToneId = (typeof GUIDED_TONES)[number]["id"];

export type GuidedAssistantInput = {
  segment: GuidedSegmentId;
  objective: GuidedObjectiveId;
  tone: GuidedToneId;
};

const SEGMENT_CONTEXT: Record<GuidedSegmentId, string> = {
  retail:
    "O negócio é de comércio (loja física ou online). Os clientes perguntam sobre produtos, stock, prazos de entrega e trocas.",
  services:
    "O negócio presta serviços profissionais. Os clientes perguntam sobre disponibilidade, orçamentos, escopo e prazos.",
  health:
    "O negócio está na área de saúde ou bem-estar. Mantém-se rigor: não dês diagnósticos nem conselhos médicos; encaminha para profissionais quando necessário.",
  food:
    "O negócio é de restauração ou delivery. Os clientes perguntam sobre menu, horários, encomendas e alergénios.",
  other: "Descreve um negócio com necessidades de atendimento variadas no WhatsApp.",
};

const OBJECTIVE_LINE: Record<GuidedObjectiveId, string> = {
  support_sales:
    "Objetivo principal: esclarecer dúvidas, orientar a compra e apoiar vendas sem ser agressivo.",
  support_only:
    "Objetivo principal: ajudar clientes que já compraram — pós-venda, dúvidas sobre uso do produto ou serviço.",
  lead_qualification:
    "Objetivo principal: perceber a necessidade do contacto, recolher informação útil e qualificar o interesse antes de passar a um humano.",
  appointments:
    "Objetivo principal: ajudar a marcar visitas, consultas ou serviços, com datas e horários claros.",
  other: "Objetivo principal: atender de forma útil e profissional no WhatsApp.",
};

const TONE_LINE: Record<GuidedToneId, string> = {
  formal: "Tom: formal e respeitoso, com tratamento adequado e frases completas.",
  friendly: "Tom: amigável e próximo, como um bom colega de equipa que ajuda o cliente.",
  objective: "Tom: direto e objetivo, sem rodeios; respostas curtas quando fizer sentido.",
  enthusiastic: "Tom: entusiasta e positivo, sem exagerar ou soar artificial.",
};

/**
 * Indica se a conta está “ativada” para o fluxo principal (onboarding + dashboard).
 * API key não entra — integrações são opcionais.
 */
export function isTenantActivationComplete(phoneConnected: boolean, promptReady: boolean): boolean {
  return phoneConnected && promptReady;
}

export function buildGuidedAssistantPrompts(input: GuidedAssistantInput): { defaultPrompt: string; systemPrompt: string } {
  const segmentBlock = SEGMENT_CONTEXT[input.segment];
  const objectiveBlock = OBJECTIVE_LINE[input.objective];
  const toneBlock = TONE_LINE[input.tone];

  const defaultPrompt = [
    "## Contexto do negócio",
    segmentBlock,
    "",
    "## Objetivo do assistente",
    objectiveBlock,
    "",
    "## Tom de comunicação",
    toneBlock,
    "",
    "## Regras gerais",
    "- Responde sempre em português, de forma clara.",
    "- Se não tiveres a informação certa, não inventes: diz que vais pedir a um colega ou que alguém da equipa responde em breve.",
    "- Não prometas descontos, prazos legais ou condições contratuais sem confirmação humana.",
    "- Se o cliente estiver insatisfeito ou pedir falar com pessoa, oferece passar o caso a um humano de imediato.",
  ].join("\n");

  const systemPrompt = [
    "És o assistente de atendimento desta empresa no WhatsApp Business. Segue rigorosamente as instruções abaixo em cada mensagem.",
    "",
    defaultPrompt,
  ].join("\n");

  return { defaultPrompt, systemPrompt };
}
