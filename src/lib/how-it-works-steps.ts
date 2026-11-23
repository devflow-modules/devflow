/**
 * Shared WhatsApp Platform onboarding steps for Home (summary) and `/como-funciona` (detail).
 * Four stages — keep titles/order stable across surfaces.
 */

export type HowItWorksStep = {
  number: string;
  title: string;
  /** One-line summary for Home. */
  summary: string;
  /** What happens in this stage. */
  happens: string;
  /** What the client informs, decides, or validates. */
  clientRole: string;
  /** What the client receives or can verify at the end. */
  outcome: string;
};

export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  {
    number: "01",
    title: "Diagnóstico da operação",
    summary:
      "Mapeamos volume, horários e onde as conversas se perdem no WhatsApp da equipe.",
    happens:
      "Conversamos sobre como o time atende hoje: canais, volume, horários críticos e onde vendas ou suporte param.",
    clientRole:
      "Informar quem atende, quais tipos de pedido entram pelo WhatsApp e o que mais gera atraso ou retrabalho.",
    outcome:
      "Um mapa claro dos gargalos e do que precisa de fila, responsável ou resposta automática.",
  },
  {
    number: "02",
    title: "Desenho dos fluxos",
    summary:
      "Definimos filas, o que a IA responde e quando a conversa vai para uma pessoa.",
    happens:
      "Desenhamos filas (por exemplo comercial e suporte), regras de prioridade e o ponto em que a automação passa o atendimento para alguém da equipe.",
    clientRole:
      "Validar quais pedidos a IA pode responder, quem assume cada fila e o que nunca deve ficar só na automação.",
    outcome:
      "Um desenho combinado das filas, responsáveis e handoff — ainda sem ir ao ar.",
  },
  {
    number: "03",
    title: "Implementação técnica",
    summary:
      "Ligamos a API oficial da Meta, a inbox da equipe, filas e handoff combinados.",
    happens:
      "Configuramos WhatsApp Cloud API oficial, inbox compartilhada, filas, responsáveis, tags e os fluxos acordados no desenho.",
    clientRole:
      "Disponibilizar o número/API e validar na inbox se distribuição, dono da conversa e handoff batem com o combinado.",
    outcome:
      "Operação pronta para uso real, com a equipe vendo quem atende cada conversa.",
  },
  {
    number: "04",
    title: "Operação acompanhada",
    summary:
      "Com a operação no ar, ajustamos fluxos e treinamos a equipe com o que a fila mostra.",
    happens:
      "Acompanhamos o que a operação revela (fila parada, handoffs, dúvidas repetidas) e refinamos fluxos junto com o time.",
    clientRole:
      "Revisar pendências com a equipe e apontar o que ainda gera ruído no dia a dia.",
    outcome:
      "Ajustes objetivos nos fluxos e um time mais à vontade com a inbox — sem prazo ou SLA inventados.",
  },
] as const;

/** Illustrative thread used only on `/como-funciona` to connect the four stages. */
export const HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE = {
  label: "Exemplo ilustrativo",
  title: "Separar comercial e suporte no mesmo WhatsApp",
  body: "Uma equipe recebe pedidos de venda e dúvidas de entrega no mesmo número. No diagnóstico isso aparece misturado; no desenho nascem filas distintas; na implementação a inbox mostra o responsável; na operação acompanhada o time vê o que ficou pendente em cada fila.",
} as const;
