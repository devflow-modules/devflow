// TODO: move to packages/niche-pages — shared config + types for hub + apps/site

import type { Metadata } from "next";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export type DemoMessage = { type: "user" | "bot"; text: string; time: string };

export type NichePain = { title: string; description: string };

export type NicheHowStep = { title: string; description: string };

export type NicheBenefit = { title: string; description: string };

export type NicheFaqItem = { question: string; answer: string };

/** Vocabulário comercial do nicho — usado de forma explícita em hero, dores, exemplo e benefícios. */
export type NicheVocabulary = {
  primary: string[];
  secondary: string[];
};

export type NicheAutomationPageConfig = {
  path:
    | "/automacao-whatsapp-restaurante"
    | "/automacao-whatsapp-clinica"
    | "/automacao-whatsapp-loja"
    | "/automacao-whatsapp-tabacaria";
  vocabulary: NicheVocabulary;
  meta: {
    title: string;
    description: string;
    keywords: string[];
    ogTitle: string;
    ogDescription: string;
  };
  hero: {
    h1: string;
    subheadline: string;
  };
  heroWhatsApp: { label: string; prefill: string };
  problems: {
    sectionTitle: string;
    intro: string;
    items: NichePain[];
  };
  howItWorks: {
    sectionTitle: string;
    intro: string;
    steps: NicheHowStep[];
  };
  exampleChat: {
    sectionTitle: string;
    intro: string;
    messages: DemoMessage[];
  };
  benefits: {
    sectionTitle: string;
    intro: string;
    items: NicheBenefit[];
  };
  /** Resultados qualitativos — sem números inventados nem depoimentos fictícios. */
  results: {
    sectionTitle: string;
    intro: string;
    items: string[];
  };
  faq: NicheFaqItem[];
  finalCta: {
    title: string;
    subtitle: string;
    whatsappLabel: string;
    whatsappPrefill: string;
  };
};

function mergeMetaKeywords(base: string[], vocab: NicheVocabulary): string[] {
  const merged = [...base, ...vocab.primary, ...vocab.secondary];
  const seen = new Set<string>();
  return merged.filter((k) => {
    const t = k.trim();
    if (!t || seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

export function buildNicheAutomationMetadata(
  config: NicheAutomationPageConfig
): Metadata {
  const url = `${baseUrl}${config.path}`;
  return {
    title: config.meta.title,
    description: config.meta.description,
    keywords: mergeMetaKeywords(config.meta.keywords, config.vocabulary),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "DevFlow Labs",
      title: config.meta.ogTitle,
      description: config.meta.ogDescription,
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `DevFlow Labs — ${config.meta.ogTitle}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: config.meta.ogTitle,
      description: config.meta.ogDescription,
      images: [ogImage],
    },
  };
}

export const AUTOMACAO_WHATSAPP_RESTAURANTE: NicheAutomationPageConfig = {
  path: "/automacao-whatsapp-restaurante",
  vocabulary: {
    primary: [
      "cardápio do dia",
      "delivery",
      "fila de pedidos",
      "rush do almoço",
      "taxa de entrega",
      "handoff para o salão",
    ],
    secondary: [
      "pedido anotado errado",
      "cozinha no pico",
      "retirada no balcão",
      "horário de pico",
      "status do pedido",
      "área de entrega",
    ],
  },
  meta: {
    title: "Automação de WhatsApp para restaurantes | DevFlow Labs",
    description:
      "Cardápio do dia, delivery, fila de pedidos e rush do almoço no WhatsApp com triagem automática e handoff para o salão quando o ticket exige humano.",
    keywords: [
      "automação whatsapp para restaurantes",
      "automação whatsapp restaurante",
      "pedidos whatsapp restaurante",
      "delivery whatsapp restaurante",
      "fila de pedidos whatsapp",
    ],
    ogTitle: "Automação WhatsApp para restaurantes | DevFlow",
    ogDescription:
      "Pedidos acumulam no horário de pico e a equipe não consegue responder tudo: cardápio, delivery e handoff no mesmo fluxo.",
  },
  hero: {
    h1: "Automação de WhatsApp para restaurantes",
    subheadline:
      "No rush do almoço e no pico do delivery, o WhatsApp vira fila de pedidos sem ordem: cardápio do dia, taxa de entrega e status misturados com urgência real. Automatize o repetitivo e use handoff para o salão ou cozinha só quando o pedido foge do script.",
  },
  heroWhatsApp: {
    label: "Falar com vendas",
    prefill:
      "Tenho restaurante: quero automação de WhatsApp para cardápio, delivery e fila de pedidos no rush. Podemos conversar?",
  },
  problems: {
    sectionTitle: "Problemas típicos de restaurante no WhatsApp",
    intro:
      "Quem opera salão + delivery sabe: o mesmo número vira cardápio, central de delivery e reclamação — tudo ao mesmo tempo no horário de pico.",
    items: [
      {
        title: "Pedidos acumulam no rush e a cozinha perde contexto",
        description:
          "Áudio, print do cardápio do dia e \"já mando o endereço\" chegam em sequência: sem fila de pedidos clara, alguém cozinha errado ou deixa mensagem sem resposta no fim da conversa.",
      },
      {
        title: "Delivery prometido sem cálculo de taxa de entrega padronizado",
        description:
          "Cada atendente explica área de entrega e taxa de um jeito; cliente acha que pode retirada no balcão grátis e no delivery paga outro valor — atrito na hora de fechar.",
      },
      {
        title: "Status do pedido espalhado entre salão e cozinha",
        description:
          "\"Já saiu?\" e \"falta quanto?\" pingam no WhatsApp enquanto o salão confere com a cozinha no grito — cliente vê silêncio e assume o pior.",
      },
      {
        title: "Cardápio do dia muda e o time ainda responde versão antiga",
        description:
          "Prato esgotou ou entrou promoção no rush: quem está na pass responde com foto velha ou copia preço errado — retrabalho e pedido anotado errado.",
      },
    ],
  },
  howItWorks: {
    sectionTitle: "Como funciona no seu restaurante",
    intro:
      "Fluxo pensado para cardápio do dia, delivery e handoff para o salão — linguagem de cozinha e pico, não de TI.",
    steps: [
      {
        title: "Entrada pelo fluxo: cardápio, delivery ou status",
        description:
          "Cliente escolhe se quer cardápio do dia, taxa de entrega por CEP ou status do pedido: cada ramo segue roteiro próprio sem travar a fila de pedidos.",
      },
      {
        title: "Regras de delivery e retirada no balcão no automático",
        description:
          "Área de entrega, horário de pico e formas de pagamento vêm do cadastro — menos improviso na hora do rush do almoço.",
      },
      {
        title: "Handoff para o salão com histórico",
        description:
          "Alergia, troca de acompanhamento ou reclamação sobe com contexto para quem está no salão ou na pass — sem cliente repetir tudo.",
      },
    ],
  },
  exampleChat: {
    sectionTitle: "Simulação de uso",
    intro:
      "Cliente → sistema → cliente → sistema → handoff para o salão: conversa com ritmo de rush do almoço, cardápio do dia e delivery no meio.",
    messages: [
      {
        type: "user",
        text: "Oi! Cardápio do dia + delivery pro Jardins ainda hoje? Tô no rush do almoço.",
        time: "12:11",
      },
      {
        type: "bot",
        text: "Olá! Hoje: bowl mediterrâneo, parmegiana e opção vegana. Delivery Jardins até 22h — taxa de entrega por CEP. Quer preço ou já montar o pedido?",
        time: "12:11",
      },
      {
        type: "user",
        text: "Bowl mediterrâneo, mas sem amendoim no molho. Dá?",
        time: "12:12",
      },
      {
        type: "bot",
        text: "Boa chamada — isso foge do cardápio padrão. Vou fazer handoff para o salão ajustar com a cozinha e confirmar o pedido com segurança. Um instante.",
        time: "12:12",
      },
      {
        type: "user",
        text: "Ok, pode ser",
        time: "12:12",
      },
      {
        type: "bot",
        text: "Salão assume nesta simulação, com o pedido anotado. O tempo de preparo a equipe confirma.",
        time: "12:12",
      },
    ],
  },
  benefits: {
    sectionTitle: "Benefícios para o seu restaurante",
    intro:
      "A fila de pedidos, o cardápio do dia e a área de entrega saem do que a casa configurou no fluxo.",
    items: [
      {
        title: "Fila de pedidos que não trava no rush do almoço",
        description:
          "Cardápio do dia, taxa de entrega e status entram no automático — o canal aguenta pico sem virar gargalo único na pass.",
      },
      {
        title: "Menos pedido anotado errado entre salão e cozinha",
        description:
          "Regras e opções padronizadas reduzem retrabalho quando o delivery e a retirada no balcão disputam a mesma equipe.",
      },
      {
        title: "Handoff para o salão só no que foge do script",
        description:
          "Alergia, troca ou reclamação sobe com contexto — humano entra para exceção, não para copiar cardápio.",
      },
      {
        title: "Delivery com área de entrega explícita",
        description:
          "Cliente entende onde entrega, quanto custa e em quanto tempo — menos ida e volta no horário de pico.",
      },
    ],
  },
  results: {
    sectionTitle: "O que a operação organiza",
    intro:
      "Cenário de uso. Não é resultado medido de cliente.",
    items: [
      "Cardápio do dia, taxa de entrega e status podem ser respondidos pela automação, quando o fluxo está ativo.",
      "Menos repetição manual no rush: o básico sai do caminho da cozinha e do salão.",
      "Fila entre delivery, retirada e salão, com handoff quando o pedido exige uma pessoa.",
      "A conversa segue com histórico, em vez de ficar no celular de alguém.",
    ],
  },
  faq: [
    {
      question: "Substitui garçom ou telefone do delivery?",
      answer:
        "Não. Complementa: o automático resolve cardápio do dia, taxa de entrega e triagem; humano fica com exceção, reclamação e experiência no salão.",
    },
    {
      question: "Cardápio do dia muda no meio do serviço?",
      answer:
        "O roteiro é revisto na implantação e quando a equipe atualiza o fluxo. Não é um cardápio que se sincroniza sozinho.",
    },
    {
      question: "Consigo enxergar a fila de pedidos?",
      answer:
        "Sim. A equipe vê a fila, o responsável e o handoff. Não há roteamento por intenção nem por carga.",
    },
  ],
  finalCta: {
    title: "Pronto para desafogar o WhatsApp do restaurante?",
    subtitle: "Demo guiada ou conversa com o time — sem compromisso.",
    whatsappLabel: "Quero automação para restaurante",
    whatsappPrefill:
      "Tenho restaurante e quero ver automação de WhatsApp para cardápio, delivery e fila de pedidos. Podemos agendar?",
  },
};

export const AUTOMACAO_WHATSAPP_CLINICA: NicheAutomationPageConfig = {
  path: "/automacao-whatsapp-clinica",
  vocabulary: {
    primary: [
      "agendamento de consulta",
      "triagem no WhatsApp",
      "convênio",
      "preparo para exame",
      "recepção",
    ],
    secondary: [
      "remarcação",
      "jornada do paciente",
      "horário liberado",
      "documentos para consulta",
      "retorno",
      "LGPD",
    ],
  },
  meta: {
    title: "Automação de WhatsApp para clínicas | DevFlow Labs",
    description:
      "Informações de agenda, convênio e preparo que a clínica definiu, com encaminhamento para a recepção. A automação não faz diagnóstico.",
    keywords: [
      "automação whatsapp para clínicas",
      "automação whatsapp clínica",
      "agendamento whatsapp clínica",
      "triagem whatsapp",
      "convênio whatsapp clínica",
    ],
    ogTitle: "Automação WhatsApp para clínicas | DevFlow",
    ogDescription:
      "Fila de agenda no WhatsApp, com informações previamente definidas e handoff para a recepção.",
  },
  hero: {
    h1: "Automação de WhatsApp para clínicas",
    subheadline:
      "O número vira fila única de agendamento de consulta, convênio e preparo para exame — sem triagem no WhatsApp, a recepção vira call center improvisado. Automatize o protocolável com respeito à LGPD e faça handoff para recepção quando a jornada do paciente exige voz humana.",
  },
  heroWhatsApp: {
    label: "Falar com vendas",
    prefill:
      "Sou clínica/consultório: quero automação de WhatsApp para agendamento de consulta, convênio e triagem. Podemos conversar?",
  },
  problems: {
    sectionTitle: "Problemas típicos de clínica no WhatsApp",
    intro:
      "Agenda, convênio e preparo para exame chegam misturados. Sem uma fila, a recepção perde o fio da conversa.",
    items: [
      {
        title: "Agendamento de consulta cai no meio de 12 conversas abertas",
        description:
          "Paciente manda \"tem horário?\" enquanto outro pede preparo para exame e um terceiro quer remarcação: sem fila, alguém fica sem horário liberado confirmado.",
      },
      {
        title: "Pergunta de saúde no chat não pode virar avaliação",
        description:
          "Sintoma ou dúvida clínica no WhatsApp precisa ir para a equipe. A automação não avalia, não orienta conduta e não faz diagnóstico.",
      },
      {
        title: "Convênio e documentos para consulta repetidos o dia inteiro",
        description:
          "Cada atendente explica convênio e documentos de um jeito; paciente chega com preparo para exame errado e a agenda atrasa o bloco inteiro.",
      },
      {
        title: "Recepção presencial compete com o celular no mesmo minuto",
        description:
          "Quem acolhe na mesa divide atenção com agendamento de consulta no WhatsApp — quem está no telefone atrasa quem está na fila física.",
      },
    ],
  },
  howItWorks: {
    sectionTitle: "Como funciona na sua clínica",
    intro:
      "Automação para informação e encaminhamento. Não faz diagnóstico. A implantação segue um checklist de privacidade.",
    steps: [
      {
        title: "Primeiro contato com o motivo da mensagem",
        description:
          "Paciente escolhe agendamento de consulta, remarcação, preparo para exame ou dúvida de convênio — cada caminho tem próximo passo certo.",
      },
      {
        title: "Protocolo único para convênio e documentos",
        description:
          "Horário liberado, documentos para consulta e preparo vêm do cadastro da clínica — menos versão diferente por atendente.",
      },
      {
        title: "Handoff para recepção com contexto",
        description:
          "Caso sensível ou fora do roteiro sobe para recepção com resumo — paciente não repete convênio, data e dúvida do zero.",
      },
    ],
  },
  exampleChat: {
    sectionTitle: "Simulação de uso",
    intro:
      "Paciente → sistema → paciente → sistema → handoff para recepção: agendamento de consulta com convênio e preparo para exame no mesmo fio.",
    messages: [
      {
        type: "user",
        text: "Bom dia — quero agendar dermatologia ainda esta semana. Unimed.",
        time: "08:47",
      },
      {
        type: "bot",
        text: "Olá! Para agendamento de consulta: temos quinta 14:20 ou sexta 09:40 com a Dra. Marina (Unimed). Prefere presencial ou teleconsulta?",
        time: "08:47",
      },
      {
        type: "user",
        text: "Quinta presencial. Preciso saber preparo para exame se for só retorno",
        time: "08:48",
      },
      {
        type: "bot",
        text: "Preparo e jejum a recepção confirma. Posso encaminhar você agora, com o histórico desta conversa.",
        time: "08:48",
      },
      {
        type: "user",
        text: "Pode passar pra recepção",
        time: "08:48",
      },
      {
        type: "bot",
        text: "Handoff iniciado: recepção vai confirmar horário liberado, convênio e preparo para exame com você agora no WhatsApp.",
        time: "08:48",
      },
    ],
  },
  benefits: {
    sectionTitle: "Benefícios para a sua clínica",
    intro:
      "Agendamento de consulta e triagem no WhatsApp alinhados à jornada do paciente — recepção no papel certo.",
    items: [
      {
        title: "Agenda com menos atrito entre convênio e retorno",
        description:
          "Horário liberado e convênio saem do protocolo — menos remarcação por informação incompleta.",
      },
      {
        title: "Triagem no WhatsApp com limite claro",
        description:
          "Administrativo e preparo para exame no automático; sintoma fora do roteiro sobe com handoff — sem improviso perigoso.",
      },
      {
        title: "Recepção focada em acolhimento e exceção",
        description:
          "Menos cópia de documentos para consulta no chat; mais tempo para paciente na mesa e casos sensíveis.",
      },
      {
        title: "Privacidade na implantação",
        description:
          "Os dados ficam separados por organização e a implantação segue um checklist de privacidade. Isso não é certificação.",
      },
    ],
  },
  results: {
    sectionTitle: "O que a operação organiza",
    intro: "Cenário de uso. A automação não avalia sintoma nem recomenda conduta.",
    items: [
      "Convênio, documentos e preparo previamente definidos podem ser respondidos pela automação.",
      "Menos repetição na recepção: o que já está no roteiro sai do caminho da agenda.",
      "Fila entre retorno, primeiro agendamento e remarcação, com handoff explícito.",
      "A recepção assume a conversa com o histórico, quando o caso sai do roteiro.",
    ],
  },
  faq: [
    {
      question: "A automação responde dúvida médica?",
      answer:
        "Não. Informação institucional, preparo para exame e encaminhamento sim; conduta clínica segue para profissional habilitado.",
    },
    {
      question: "Paciente consegue remarcação dentro de regra?",
      answer:
        "O desenho da agenda entra na implantação acompanhada. A automação não altera o prontuário sozinha.",
    },
    {
      question: "E LGPD no triagem no WhatsApp?",
      answer:
        "A implantação segue um checklist de privacidade e separa os dados por organização. Não é uma certificação formal.",
    },
  ],
  finalCta: {
    title: "Quer ver automação pensada para jornada do paciente?",
    subtitle: "Demo guiada ou conversa com o time.",
    whatsappLabel: "Quero automação para clínica",
    whatsappPrefill:
      "Tenho clínica/consultório e quero automação de WhatsApp para agendamento de consulta, convênio e triagem. Podemos agendar?",
  },
};

export const AUTOMACAO_WHATSAPP_LOJA: NicheAutomationPageConfig = {
  path: "/automacao-whatsapp-loja",
  vocabulary: {
    primary: [
      "estoque na loja",
      "preço e parcelamento",
      "retirada no balcão",
      "vendas pelo WhatsApp",
      "handoff para o vendedor",
    ],
    secondary: [
      "SKU",
      "troca e garantia",
      "cupom",
      "vitrine digital",
      "conversão",
      "prateleira",
    ],
  },
  meta: {
    title: "Automação de WhatsApp para lojas | DevFlow Labs",
    description:
      "Preço, parcelamento e retirada no WhatsApp, com o que foi configurado no fluxo e handoff para o vendedor.",
    keywords: [
      "automação whatsapp para lojas",
      "automação whatsapp loja",
      "vendas pelo whatsapp",
      "estoque whatsapp loja",
      "atendimento loja whatsapp",
    ],
    ogTitle: "Automação WhatsApp para lojas | DevFlow",
    ogDescription:
      "Cliente quente esperando preço e retirada no balcão enquanto o time repete estoque na mão — automação com handoff para o vendedor.",
  },
  hero: {
    h1: "Automação de WhatsApp para lojas",
    subheadline:
      "Cliente pergunta estoque, preço e retirada no mesmo fio. A automação responde o que a loja definiu e a conversa segue para o vendedor quando precisa fechar.",
  },
  heroWhatsApp: {
    label: "Falar com vendas",
    prefill:
      "Tenho loja: quero automação de WhatsApp para estoque na loja, preço e parcelamento e handoff para o vendedor. Podemos conversar?",
  },
  problems: {
    sectionTitle: "Problemas típicos de loja no WhatsApp",
    intro:
      "Vitrine digital concentra curioso e comprador quente — sem prioridade, o mesmo atendente trata SKU e reclamação misturados.",
    items: [
      {
        title: "Dez abas de \"tem no estoque na loja?\" ao mesmo tempo no pico",
        description:
          "Promoção ou saldão: o time digita disponibilidade de SKU na mão enquanto fila cresce — quem quer fechar vendas pelo WhatsApp esfria esperando preço.",
      },
      {
        title: "Preço e parcelamento explicados diferente por atendente",
        description:
          "Um promete 3x sem juros, outro diz que só no PIX tem desconto — troca e garantia viram discussão porque a vitrine digital não tem uma fonte de verdade.",
      },
      {
        title: "Retirada no balcão prometida sem regra clara de reserva",
        description:
          "Cliente acha que segurou o produto porque mandou \"quero\"; loja não reservou — conversão vira atrito na porta.",
      },
      {
        title: "Vendedor vira buscador de estoque em vez de closer",
        description:
          "Boa parte do tempo vai em \"deixa eu ver na prateleira\" no WhatsApp, em vez de fechar a conversa.",
      },
    ],
  },
  howItWorks: {
    sectionTitle: "Como funciona na sua loja",
    intro:
      "Linguagem de prateleira, estoque na loja e cupom — cliente sente que fala com a loja, não com FAQ genérico.",
    steps: [
      {
        title: "Catálogo e estoque na loja no automático",
        description:
          "Preço e retirada saem do que foi configurado no fluxo. Fora do horário, a conversa fica na fila para a equipe.",
      },
      {
        title: "Qualificação antes do vendedor",
        description:
          "A pessoa informa modelo ou tamanho. A resposta usa o que a loja configurou. Estoque ao vivo não é consultado. O vendedor entra quando a conversa precisa fechar.",
      },
      {
        title: "Troca e garantia e cupom no script oficial",
        description:
          "Política única reduz promessa fora do padrão — B2B ou negociação especial sobe com histórico.",
      },
    ],
  },
  exampleChat: {
    sectionTitle: "Simulação de uso",
    intro:
      "Cliente → sistema → cliente → sistema → handoff para o vendedor: estoque na loja, preço e parcelamento e retirada no balcão.",
    messages: [
      {
        type: "user",
        text: "Oi! AirRun 42 preto ainda tem no estoque na loja? Quero retirada no balcão amanhã cedo.",
        time: "19:52",
      },
      {
        type: "bot",
        text: "Olá! Nesta simulação, o fluxo responde o preço e a retirada que a loja configurou. Não consulto estoque ao vivo. Quer parcelamento em 3x ou PIX com desconto?",
        time: "19:52",
      },
      {
        type: "user",
        text: "3x sem juros. Consegem segurar até eu chegar às 11h?",
        time: "19:53",
      },
      {
        type: "bot",
        text: "A política de reserva desta simulação pede confirmação da equipe. Vou passar a conversa para o vendedor, com o horário e o pedido de parcelamento.",
        time: "19:53",
      },
      {
        type: "user",
        text: "Pode chamar o vendedor",
        time: "19:53",
      },
      {
        type: "bot",
        text: "Handoff feito: vendedor assume com seu SKU, horário de retirada no balcão e pedido de parcelamento.",
        time: "19:53",
      },
    ],
  },
  benefits: {
    sectionTitle: "Benefícios para a sua loja",
    intro:
      "Preço e retirada saem do fluxo configurado. A conversa segue para o vendedor quando precisa fechar.",
    items: [
      {
        title: "Informação de produto no fluxo permitido",
        description:
          "Preço e política saem do que foi configurado. Estoque ao vivo não é consultado automaticamente.",
      },
      {
        title: "Handoff para o vendedor só no fechamento",
        description:
          "Parcelamento, cupom ou troca e garantia fora do padrão sobem com contexto — closer entra pronto.",
      },
      {
        title: "Menos promessa solta sobre estoque na loja",
        description:
          "Uma fonte de verdade para vitrine digital e balcão — menos erro e menos cliente irritado na porta.",
      },
      {
        title: "Pico de mensagem no mesmo inbox",
        description:
          "A automação cobre o repetitivo. A equipe assume, transfere ou devolve a conversa na fila.",
      },
    ],
  },
  results: {
    sectionTitle: "O que a operação organiza",
    intro: "Cenário de uso. Sem número de conversão e sem consulta automática de estoque.",
    items: [
      "Preço, parcelamento e retirada podem ser respondidos pelo fluxo permitido.",
      "Menos repetição para o vendedor no que já está no roteiro.",
      "Fila compartilhada, com handoff quando a conversa precisa de uma pessoa.",
      "O histórico fica na conversa, não no celular de alguém.",
    ],
  },
  faq: [
    {
      question: "Substitui ERP ou e-commerce?",
      answer:
        "Não substitui: conversa com o que você já usa. Foco em fila e vendas pelo WhatsApp com regras claras.",
    },
    {
      question: "Consigo priorizar retirada no balcão hoje?",
      answer:
        "A equipe pode separar filas, por exemplo retirada e dúvida. Não há distribuição automática por intenção de compra.",
    },
    {
      question: "Catálogo grande demais?",
      answer:
        "Fluxo pode segmentar por categoria ou busca — evita empurrar mil SKUs numa única lista.",
    },
  ],
  finalCta: {
    title: "Quer organizar o atendimento da loja no WhatsApp?",
    subtitle: "Demo ou conversa com especialista.",
    whatsappLabel: "Quero automação para loja",
    whatsappPrefill:
      "Tenho loja física/online e quero automação de WhatsApp para estoque, preço e handoff para o vendedor. Podemos agendar?",
  },
};

export const AUTOMACAO_WHATSAPP_TABACARIA: NicheAutomationPageConfig = {
  path: "/automacao-whatsapp-tabacaria",
  vocabulary: {
    primary: [
      "essências e linhas",
      "delivery da tabacaria",
      "balcão",
      "área de entrega",
      "pedido para separação",
    ],
    secondary: [
      "mix de produtos",
      "turno no pico",
      "taxa por CEP",
      "PIX na entrega",
      "separação no balcão",
      "política da loja",
    ],
  },
  meta: {
    title: "Automação de WhatsApp para tabacarias | DevFlow Labs",
    description:
      "Essências, delivery e área de entrega no WhatsApp, com o roteiro permitido e handoff para o balcão.",
    keywords: [
      "automação whatsapp para tabacarias",
      "automação whatsapp tabacaria",
      "delivery tabacaria whatsapp",
      "pedidos whatsapp tabacaria",
      "atendimento tabacaria whatsapp",
    ],
    ogTitle: "Automação WhatsApp para tabacarias | DevFlow",
    ogDescription:
      "Mix de produtos alto + pico no turno: automação para catálogo permitido e handoff para o balcão no pedido para separação.",
  },
  hero: {
    h1: "Automação de WhatsApp para tabacarias",
    subheadline:
      "Tabacaria lida com mix de produtos alto: cliente pergunta essências e linhas, delivery da tabacaria e taxa por CEP no mesmo bate-papo. No pico do turno, o balcão não pode virar teclado. Automatize o permitido e use handoff para o balcão quando o pedido para separação ou pagamento exige humano.",
  },
  heroWhatsApp: {
    label: "Falar com vendas",
    prefill:
      "Tenho tabacaria: quero automação de WhatsApp para essências e linhas, delivery e handoff para o balcão. Podemos conversar?",
  },
  problems: {
    sectionTitle: "Problemas típicos de tabacaria no WhatsApp",
    intro:
      "Delivery da tabacaria e retirada no balcão competem pelo mesmo WhatsApp — sem roteiro, separação no balcão atrasa.",
    items: [
      {
        title: "No pico do turno, o balcão vira copia-e-cola de essências e linhas",
        description:
          "Sexta à noite: dez conversas perguntando sabor e disponibilidade enquanto alguém separa pedido para separação na loja — quem está no balcão trava.",
      },
      {
        title: "Área de entrega e taxa por CEP explicadas de um jeito diferente por atendente",
        description:
          "Cliente ouve uma taxa no WhatsApp e outra na entrega — política da loja parece flexível quando na verdade é falta de script.",
      },
      {
        title: "Pedido para separação chega incompleto e o delivery volta",
        description:
          "\"Fecha 2\" sem sabor claro ou sem PIX na entrega definido — separação no balcão refaz conversa e o motorista espera.",
      },
      {
        title: "Curioso e cliente com PIX na mão na mesma fila",
        description:
          "Quem só pede foto do mostruário empurra quem já escolheu essências e linhas e quer delivery da tabacaria agora.",
      },
    ],
  },
  howItWorks: {
    sectionTitle: "Como funciona na sua tabacaria",
    intro:
      "Respeitando idade mínima e política da loja: informação e pedido no automático, balcão na exceção.",
    steps: [
      {
        title: "Catálogo permitido e mix de produtos no script",
        description:
          "Essências e linhas disponíveis e indisponível temporário vêm do cadastro — resposta uniforme em qualquer turno no pico.",
      },
      {
        title: "Delivery da tabacaria com área de entrega e taxa por CEP",
        description:
          "Cliente entende onde entrega, taxa e PIX na entrega ou no balcão — menos ida e volta com motorista na porta.",
      },
      {
        title: "Handoff para o balcão no pedido para separação sensível",
        description:
          "Combinação fora do padrão ou pagamento especial sobe com contexto — separação no balcão fala com histórico.",
      },
    ],
  },
  exampleChat: {
    sectionTitle: "Simulação de uso",
    intro:
      "Cliente → sistema → cliente → sistema → handoff para o balcão: essências e linhas, taxa por CEP e pedido para separação.",
    messages: [
      {
        type: "user",
        text: "Boa noite! Tem essência linha X frutas vermelhas e cereja? Delivery da tabacaria pro 01310-100 ainda hoje?",
        time: "18:04",
      },
      {
        type: "bot",
        text: "Nesta simulação, frutas vermelhas e cereja estão no roteiro. A equipe confirma taxa e forma de pagamento no handoff.",
        time: "18:04",
      },
      {
        type: "user",
        text: "01310-100. Quero 2 frutas vermelhas e pagamento PIX na entrega",
        time: "18:05",
      },
      {
        type: "bot",
        text: "A taxa e o pagamento ficam com o balcão, junto com a conferência de idade da política da loja. Encaminho esta conversa.",
        time: "18:05",
      },
      {
        type: "user",
        text: "Ok, manda pro balcão",
        time: "18:05",
      },
      {
        type: "bot",
        text: "Balcão assume nesta simulação, com o histórico do pedido. Sem prazo prometido.",
        time: "18:05",
      },
    ],
  },
  benefits: {
    sectionTitle: "Benefícios para a sua tabacaria",
    intro:
      "Delivery da tabacaria e balcão alinhados — menos retrabalho na separação no balcão e mais previsibilidade no turno no pico.",
    items: [
      {
        title: "Menos digitação repetida de essências e linhas",
        description:
          "Equipe sai do modo copiar disponibilidade e volta a operar mix de produtos com foco.",
      },
      {
        title: "Área de entrega e taxa por CEP explícitas",
        description:
          "Cliente entende delivery da tabacaria antes do motorista sair — menos cancelamento em cima da hora.",
      },
      {
        title: "Fila para o pedido que já tem contexto",
        description:
          "A equipe vê o que ainda precisa de resposta e pode transferir o pedido para o balcão.",
      },
      {
        title: "Handoff para o balcão com contexto de PIX na entrega",
        description:
          "Separador vê histórico — menos erro e menos cliente repetindo CEP e combinação.",
      },
    ],
  },
  results: {
    sectionTitle: "O que a operação organiza",
    intro: "Cenário de uso. Sem prazo de resposta e sem taxa calculada automaticamente.",
    items: [
      "Disponibilidade do roteiro, área de entrega e handoff para confirmar a taxa.",
      "Menos repetição no turno: o básico não compete com a separação no balcão.",
      "Fila entre delivery e retirada, com handoff quando o pedido exige uma pessoa.",
      "O balcão recebe o histórico, em vez de a conversa recomeçar.",
    ],
  },
  faq: [
    {
      question: "Como fica confirmação de idade e política da loja?",
      answer:
        "O roteiro segue a exigência legal e a política da loja (retirada, entrega, documento). Ajustamos com você antes de publicar.",
    },
    {
      question: "Substitui atendente no balcão?",
      answer:
        "Não. Libera o balcão do repetitivo do WhatsApp para separação, caixa e cliente na loja.",
    },
    {
      question: "Promoção de essências e linhas?",
      answer:
        "Combos entram quando a equipe atualiza o fluxo. A oferta não se publica sozinha.",
    },
  ],
  finalCta: {
    title: "Quer agilizar pedidos no WhatsApp da tabacaria?",
    subtitle: "Demo ou conversa com o time comercial.",
    whatsappLabel: "Quero automação para tabacaria",
    whatsappPrefill:
      "Tenho tabacaria e quero automação de WhatsApp para delivery, essências e linhas e handoff para o balcão. Podemos agendar?",
  },
};
