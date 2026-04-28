/** Mensagens prontas (copiar para o WhatsApp). PT-BR. */
export type ProspectMessageTemplate = {
  id: string;
  label: string;
  text: string;
};

export const PROSPECT_MESSAGE_TEMPLATES: ProspectMessageTemplate[] = [
  {
    id: "open",
    label: "Abertura",
    text: "Oi — aqui é [seu nome] da DevFlow Labs. Vi que vocês [contexto em uma linha]. Montamos operação de WhatsApp com IA + humano sem soar genérico. Posso fazer duas perguntas rápidas para ver se encaixa?",
  },
  {
    id: "fu1",
    label: "Follow-up 1",
    text: "Oi [nome], te escrevi outro dia e pode ter passado batido. Ainda faz sentido um diagnóstico de 15 min esta semana? Se não for prioridade, é só dizer que eu encerro por aqui.",
  },
  {
    id: "qualify",
    label: "Qualificação",
    text: "Para eu te orientar melhor: (1) quantos atendimentos/dia no WhatsApp, mais ou menos? (2) o maior gargalo hoje é volume, velocidade ou qualidade da resposta?",
  },
  {
    id: "close_step",
    label: "Próximo passo",
    text: "Perfeito — próximo passo: [diagnóstico / proposta / envio de material]. Te proponho [data/horário]. Confirma se funciona?",
  },
];
