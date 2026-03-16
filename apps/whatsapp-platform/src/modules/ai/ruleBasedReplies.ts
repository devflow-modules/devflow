/**
 * Respostas baseadas em regras (portado do código real).
 * Usado quando AI não está configurada ou para fluxo demo.
 */

export const MESSAGES = {
  welcome: `Olá 👋

Obrigado por entrar em contato com a DevFlow Labs.

Automatizamos atendimento no WhatsApp para empresas que recebem muitas mensagens.

Como posso ajudar?

1️⃣ Ver como funciona a automação
2️⃣ Testar uma demonstração
3️⃣ Falar com especialista`,

  qualification: `Qual tipo de negócio você possui?

1️⃣ Restaurante
2️⃣ Tabacaria
3️⃣ Loja
4️⃣ Outro`,

  demo: `Esta é uma demonstração da automação DevFlow.

Envie "menu" para ver as opções.

Ou digite o número da opção que deseja:
1️⃣ Ver como funciona
2️⃣ Testar demonstração
3️⃣ Falar com especialista`,

  menu: `Como posso ajudar?

1️⃣ Ver como funciona a automação
2️⃣ Testar uma demonstração
3️⃣ Falar com especialista`,

  option1: `Nossa automação funciona assim:

• Responde perguntas frequentes 24/7
• Transfere para atendente humano quando preciso
• Métricas em tempo real
• Piloto de 7 dias grátis

Quer testar ou falar com um especialista?
Envie 2 para demo ou 3 para falar com humano.`,

  option2: `Para testar a demonstração, acesse:

https://devflowlabs.com.br/demo

Lá você pode simular uma conversa e ver como a automação responde.

Precisa de mais alguma coisa?`,

  option3: `Vou conectar você com nossa equipe.

Um especialista deve responder em breve.

Enquanto isso, conheça o site: https://devflowlabs.com.br`,

  fallback: `Não entendi. Envie "menu" para ver as opções disponíveis.`,
} as const;

export type MessageKey = keyof typeof MESSAGES;

const NORMALIZE = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function parseMessage(text: string): MessageKey | null {
  const normalized = NORMALIZE(text);

  const greetings = [
    "oi", "ola", "olá", "bom dia", "boa tarde", "boa noite", "inicio", "start", "começar", "iniciar",
  ];
  if (greetings.includes(normalized)) return "welcome";
  if (["menu", "opcoes", "opções", "ajuda", "help", "0"].includes(normalized)) return "menu";
  if (["1", "um", "como funciona", "funciona", "ver automação"].includes(normalized)) return "option1";
  if (["2", "dois", "demo", "demonstração", "demonstracao", "testar"].includes(normalized)) return "option2";
  if (["3", "tres", "três", "especialista", "humano", "atendente", "pessoa", "falar com alguém"].includes(normalized)) return "option3";
  return null;
}

export function getReplyForMessage(text: string): string {
  const isDemoMode = process.env.WHATSAPP_DEMO_MODE === "true";
  if (isDemoMode && text.toLowerCase().trim() === "demo") return MESSAGES.demo;
  const intent = parseMessage(text);
  return intent ? MESSAGES[intent] : MESSAGES.fallback;
}
