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
      description: "Gestor não sabe quem está com a conversa, o que está na fila ou o que ainda precisa de resposta.",
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
      "Um responsável por conversa",
      "Histórico compartilhado entre quem atende",
    ],
    expectedOutcome:
      "Mais clareza sobre a fila e menos repetição manual no horário de pico.",
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
      "Respostas automáticas para cardápio, horário e entrega, quando o fluxo está ativo",
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
      "Informações de agenda e preparo que a clínica definiu antes",
      "Separação entre novos pacientes e retornos na fila",
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
      "Fila para o que ainda precisa de resposta",
      "Respostas automáticas para informações básicas, quando o fluxo está ativo",
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
    description: "Desenhamos como a inbox, os responsáveis, as filas e o handoff entram no fluxo.",
  },
  {
    title: "Implantação guiada",
    description: "Configuramos o número, validamos o fluxo e acompanhamos os primeiros atendimentos.",
  },
] as const;

export const authenticCaseSection = {
  title: "O case real nasce depois da operação rodando",
  body: "Um case público só entra aqui depois da implantação e com autorização de quem operou. Até lá, esta página mostra cenários.",
  bullets: [
    "Como a fila foi desenhada",
    "Quem ficou responsável",
    "O que a automação podia responder",
    "Quando a conversa foi para uma pessoa",
    "Aprendizados da operação",
  ] as const,
};
