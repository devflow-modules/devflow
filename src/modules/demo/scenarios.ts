import type { DemoScenarioDefinition, DemoScenarioId } from "./types";

const VALUE_PREFIX =
  "Resposta instantânea 24/7: você captura o lead, qualifica no chat e só chama humano quando faz sentido.\n\n";

export const DEMO_SCENARIOS: Record<DemoScenarioId, DemoScenarioDefinition> = {
  restaurante: {
    id: "restaurante",
    label: "Restaurante",
    shortLabel: "Restaurante",
    description: "Reservas, cardápio e pedidos — triagem antes do garçom.",
    intro: `${VALUE_PREFIX}Cenário: restaurante\n\nSou o assistente do seu restaurante. Tiro dúvidas do cardápio, horários e encaminho pedidos ou reservas para a equipe.\n\nRoteiro sugerido: use os atalhos abaixo ou digite livremente.`,
    suggestedPrompts: [
      "Quero reservar mesa para sábado",
      "Tem opção vegana no cardápio?",
      "Quero falar com um atendente",
    ],
    keywordReplies: {
      reserva:
        "Perfeito — triagem automática: anotei interesse em mesa para sábado. Na operação real isso cai no painel com prioridade e sua equipe confirma horário e lugares.\n\nQuer incluir observação (aniversário, criança)?",
      mesa: "Consigo registrar o pedido de mesa e avisar a equipe na hora. Prefere almoço ou jantar?",
      vegan:
        "Sim — temos opções vegetarianas e veganas no cardápio. Quer que eu liste os pratos ou já encaminhe para o chef confirmar disponibilidade do dia?",
      vegana:
        "Sim — temos opções vegetarianas e veganas no cardápio. Quer que eu liste os pratos ou já encaminhe para o chef confirmar disponibilidade do dia?",
      cardápio:
        "Segue o cardápio resumido: entradas, pratos principais e sobremesas. Posso filtrar por sem glúten ou vegetariano — o que prefere?",
      cardapio:
        "Segue o cardápio resumido: entradas, pratos principais e sobremesas. Posso filtrar por sem glúten ou vegetariano — o que prefere?",
      horário:
        "Funcionamento: seg–qui 11h–23h, sex–sáb 11h–24h, dom 11h–16h. Delivery até 22h em dias de semana.",
      horario:
        "Funcionamento: seg–qui 11h–23h, sex–sáb 11h–24h, dom 11h–16h. Delivery até 22h em dias de semana.",
      pedido:
        "Anotado! Na prática o pedido entra como ticket para cozinha e caixa — menos erro e mais rapidez no pico.",
      delivery:
        "Delivery ativo pela região. Informe CEP ou bairro e eu qualifico se atendemos e tempo estimado.",
      preço:
        "Preços variam por prato. Posso indicar faixa ou passar para humano montar orçamento para evento.",
      preco:
        "Preços variam por prato. Posso indicar faixa ou passar para humano montar orçamento para evento.",
    },
    defaultReply:
      "Boa pergunta. Consigo qualificar melhor com um detalhe a mais — ou posso conectar você com a equipe se preferir falar com alguém agora.",
  },
  tabacaria: {
    id: "tabacaria",
    label: "Tabacaria",
    shortLabel: "Tabacaria",
    description: "Essências, estoque e horário — menos mensagem repetida no balcão.",
    intro: `${VALUE_PREFIX}Cenário: tabacaria\n\nAtendo dúvidas sobre essências, marcas e horário e libero seu time para venda consultiva.\n\nRoteiro sugerido: use os atalhos ou pergunte como quiser.`,
    suggestedPrompts: [
      "Tem essência de morango?",
      "Vocês entregam?",
      "Quero falar com o balcão",
    ],
    keywordReplies: {
      morango:
        "Temos essência de morango (clássica e com notas extras). Quer saber marca disponível ou já separar retirada?",
      essência:
        "Temos linha variada de essências. Diga o sabor ou marca que busco disponibilidade em tempo real no estoque integrado.",
      essencia:
        "Temos linha variada de essências. Diga o sabor ou marca que busco disponibilidade em tempo real no estoque integrado.",
      menta: "Menta em estoque. Quer 50g, 100g ou outro formato?",
      entrega:
        "Fazemos entrega na região (motoboy / parceiros). Informe bairro para eu confirmar cobertura e prazo.",
      horário: "Funcionamos seg–sáb 9h–19h, dom até 14h. Feriados avisamos no status da loja.",
      horario: "Funcionamos seg–sáb 9h–19h, dom até 14h. Feriados avisamos no status da loja.",
      preço:
        "Preços mudam por marca e peso. Posso dar faixa ou transferir para o balcão com seu interesse já resumido.",
      preco:
        "Preços mudam por marca e peso. Posso dar faixa ou transferir para o balcão com seu interesse já resumido.",
      carvão: "Carvão e acessórios — temos pacotes P e G. Quer retirada ou entrega?",
      pedido:
        "Pedido registrado na fila interna. Na operação real o balcão vê o resumo e só confirma pagamento.",
    },
    defaultReply:
      "Posso ajudar com estoque, sabores ou entrega. Se for algo muito específico, o handoff para o balcão é um toque — quer que eu faça isso?",
  },
  loja: {
    id: "loja",
    label: "Loja / serviços",
    shortLabel: "Loja",
    description: "Disponibilidade, horário e encaminhamento — um funil simples.",
    intro: `${VALUE_PREFIX}Cenário: loja ou prestador de serviço\n\nRespondo sobre horário, disponibilidade e primeiro contato; o especialista humano fecha a venda ou agenda.\n\nRoteiro sugerido: experimente os atalhos.`,
    suggestedPrompts: [
      "Vocês têm o produto X em estoque?",
      "Qual o horário de atendimento?",
      "Preciso falar com um vendedor",
    ],
    keywordReplies: {
      estoque:
        "Consultei o catálogo: consigo dizer sim/não/sob consulta conforme sua base. Qual SKU, modelo ou referência você tem?",
      produto:
        "Me diga modelo ou categoria — faço triagem e, se não houver match automático, já preparo o resumo para o vendedor.",
      horário:
        "Atendimento: seg–sex 9h–18h, sáb 9h–13h. Agendamento pode ser pelo mesmo canal com confirmação humana.",
      horario:
        "Atendimento: seg–sex 9h–18h, sáb 9h–13h. Agendamento pode ser pelo mesmo canal com confirmação humana.",
      garantia:
        "Garantia segue nota e política do fabricante. Posso enviar o link da política ou encaminhar para suporte humano.",
      troca:
        "Trocas em até 7 dias (sem uso), com nota. Quer que eu abra um protocolo para o time revisar?",
      orçamento:
        "Orçamento personalizado: coletamos nome, necessidade e prazo e um humano retorna com proposta — quer seguir por aqui?",
      agendamento:
        "Ótimo — qual serviço e melhor período (manhã/tarde)? Registro para confirmação humana em seguida.",
    },
    defaultReply:
      "Consigo orientar sobre horários e próximos passos. Para negociação ou visita técnica recomendo handoff — diga se quer falar com vendedor ou suporte.",
  },
};

export const HANDOFF_PHRASES = [
  "falar com um atendente",
  "falar com atendente",
  "falar com o balcão",
  "falar com balcão",
  "falar com um vendedor",
  "falar com vendedor",
  "falar com humano",
  "falar com especialista",
  "quero falar com humano",
  "preciso falar com",
  "atendente humano",
  "transferir para humano",
  "conectar com humano",
];

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isHandoffIntent(text: string): boolean {
  const n = normalizeForMatch(text);
  return HANDOFF_PHRASES.some((p) => n.includes(normalizeForMatch(p)));
}

export function listScenarioIds(): DemoScenarioId[] {
  return ["restaurante", "tabacaria", "loja"];
}
