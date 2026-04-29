/**
 * Conteúdo da página /cases — exemplos operacionais (simulações), sem cases de clientes inventados.
 */

export const CASES_TRANSPARENCY_NOTE =
  "Os exemplos abaixo são simulações operacionais. Cases reais com clientes serão publicados após validação e autorização.";

export const whyExamplesExist = {
  title: "Antes do case real, vem o cenário real",
  body: "Nem toda empresa começa com métricas prontas. Por isso, a DevFlow Labs trabalha primeiro com diagnóstico: entendemos o fluxo atual, simulamos a operação ideal e implantamos o WhatsApp com controle.",
  cards: [
    {
      title: "Atendimento disperso",
      description: "Mensagens chegam, mas ninguém sabe o que está pendente.",
    },
    {
      title: "Respostas repetidas",
      description: "Equipe perde tempo respondendo as mesmas perguntas todos os dias.",
    },
    {
      title: "Sem visibilidade",
      description: "Gestor não sabe tempo de resposta, fila, gargalos ou conversas críticas.",
    },
  ] as const,
};

export type CasesNicheExample = {
  slug: string;
  badge: string;
  title: string;
  scenario: string;
  platformHelps: readonly string[];
  expectedOutcome: string;
  /** `featured` = único CTA em destaque verde no grid (landing já publicada). */
  featured: boolean;
  ctaHref: string;
  ctaLabel: string;
};

export const nicheExamples: readonly CasesNicheExample[] = [
  {
    slug: "tabacaria",
    badge: "Tabacaria",
    title: "Tabacaria com pedidos, dúvidas e entregas pelo WhatsApp",
    scenario:
      "Clientes perguntam preço, disponibilidade, horário e entrega. Parte das mensagens se perde em horários de pico.",
    platformHelps: [
      "Inbox para separar conversas pendentes e respondidas",
      "Respostas automáticas para dúvidas frequentes",
      "Handoff humano quando o cliente quer comprar",
      "Priorização de mensagens com intenção comercial",
      "Métricas de tempo de resposta",
    ],
    expectedOutcome:
      "Mais controle sobre a fila, menos repetição manual e atendimento mais rápido nos momentos de maior demanda.",
    featured: true,
    ctaHref: "/automacao-whatsapp-tabacaria",
    ctaLabel: "Ver exemplo para tabacaria",
  },
  {
    slug: "restaurante",
    badge: "Restaurante / delivery",
    title: "Restaurante com pedidos e dúvidas chegando pelo WhatsApp",
    scenario:
      "Pedidos, alterações, dúvidas sobre cardápio e status de entrega chegam ao mesmo tempo.",
    platformHelps: [
      "Respostas rápidas para cardápio, horário e entrega",
      "Organização da fila por pedido, dúvida ou reclamação",
      "Encaminhamento para humano em casos sensíveis",
      "Controle de atendimento em horários de pico",
    ],
    expectedOutcome:
      "Menos confusão na fila, atendimento mais previsível e redução de mensagens esquecidas.",
    featured: false,
    ctaHref: "/contato",
    ctaLabel: "Quero simular meu caso",
  },
  {
    slug: "clinica",
    badge: "Clínica / estética",
    title: "Clínica com agendamentos e remarcações no WhatsApp",
    scenario:
      "Pacientes chamam para horários, valores, confirmação, remarcação e dúvidas recorrentes.",
    platformHelps: [
      "Triagem inicial automática",
      "Separação entre novos pacientes e retornos",
      "Handoff humano para negociação e confirmação",
      "Histórico centralizado da conversa",
    ],
    expectedOutcome:
      "Mais organização no pré-atendimento e menos dependência de resposta manual para perguntas básicas.",
    featured: false,
    ctaHref: "/contato",
    ctaLabel: "Quero simular meu caso",
  },
  {
    slug: "loja",
    badge: "Loja local / varejo",
    title: "Loja local com dúvidas sobre produto, preço e disponibilidade",
    scenario:
      "Clientes perguntam se tem produto, preço, formas de pagamento e retirada. A venda pode depender de resposta rápida.",
    platformHelps: [
      "Priorização de conversas com intenção de compra",
      "Respostas automáticas para informações básicas",
      "Atendimento humano para fechar venda",
      "Visão gerencial da fila",
    ],
    expectedOutcome:
      "Mais velocidade no atendimento comercial e menor chance de perder cliente por demora.",
    featured: false,
    ctaHref: "/contato",
    ctaLabel: "Quero simular meu caso",
  },
] as const;

export const operationSteps = [
  {
    title: "Diagnóstico",
    description:
      "Mapeamos volume, horários críticos, equipe, perguntas repetidas e gargalos.",
  },
  {
    title: "Modelo de operação",
    description: "Desenhamos como a inbox, automações, handoff e métricas entram no fluxo.",
  },
  {
    title: "Implantação guiada",
    description: "Configuramos o número, validamos o fluxo e acompanhamos os primeiros atendimentos.",
  },
] as const;

export const authenticCaseSection = {
  title: "O case real nasce depois da operação rodando",
  body: "Depois da implantação, acompanhamos os indicadores e, com autorização do cliente, transformamos os aprendizados em um case público.",
  bullets: [
    "Antes e depois do fluxo",
    "Tempo de resposta",
    "Volume de conversas",
    "Gargalos removidos",
    "Aprendizados da operação",
  ] as const,
};
