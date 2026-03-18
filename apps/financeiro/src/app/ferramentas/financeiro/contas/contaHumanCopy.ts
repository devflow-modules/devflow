/** Textos humanos — Financeiro conta (sem jargão técnico). */

export const ERROS_AMIGAVEIS: Record<string, string> = {
  EXCEEDS_REMAINING: "Esse valor é maior do que ainda falta pagar neste acerto.",
  EXCEEDS_REFUNDABLE: "Esse valor é maior do que ainda pode ser estornado neste pagamento.",
  RATE_LIMIT_EXCEEDED: "Várias ações em pouco tempo. Aguarde cerca de um minuto e tente de novo.",
  NOT_FOUND: "Não encontramos esse registro. Atualize a página se precisar.",
  AUTH_REQUIRED: "Faça login para continuar.",
  MANUAL_SETTLEMENT_BLOCKED: "Já existe um acerto em aberto entre essas pessoas. Ajuste o que está pendente antes.",
  SETTLEMENT_COMPLETE_INVALID: "Esse acerto não pode ser marcado assim agora.",
  NOT_COMPLETED: "Só é possível reabrir acertos já quitados.",
  NOTHING_TO_REVERSE: "Não há valor disponível para estornar neste pagamento.",
  INVALID_AMOUNT: "Informe um valor válido.",
  PAID_FIELDS_REQUIRE_PAID_STATUS: "Para marcar como pago, use a opção “já paguei”.",
  HOUSEHOLD_REQUIRED: "Você precisa estar em uma casa para usar o Financeiro.",
  ERROR: "Algo deu errado. Tente de novo.",
};

export function apiErrorMessageAmigavel(payload: {
  error?: { message?: string; code?: string };
}): string {
  const code = payload.error?.code;
  if (code && ERROS_AMIGAVEIS[code]) return ERROS_AMIGAVEIS[code];
  const msg = payload.error?.message?.trim();
  if (!msg) return "Não foi possível concluir. Tente de novo em instantes.";
  if (/^[A-Z][A-Z0-9_]{3,}$/.test(msg)) return ERROS_AMIGAVEIS.ERROR;
  return msg;
}

type PartRef = { id: string; userId?: string | null };

export function linhaAcertoHumana(
  fromName: string,
  toName: string,
  valor: number,
  fromPid: string,
  toPid: string,
  participants: PartRef[],
  meUserId: string | null
): string {
  const fromUid = participants.find((p) => p.id === fromPid)?.userId ?? null;
  const toUid = participants.find((p) => p.id === toPid)?.userId ?? null;
  const euPago = !!(meUserId && fromUid === meUserId);
  const euRecebo = !!(meUserId && toUid === meUserId);
  const r = valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (euRecebo && !euPago) return `${fromName} precisa te pagar R$ ${r}`;
  if (euPago && !euRecebo) return `Você precisa pagar R$ ${r} para ${toName}`;
  return `${fromName} precisa pagar R$ ${r} para ${toName}`;
}

export function linhaSugestaoHumana(
  from: string,
  to: string,
  valor: number,
  participants: { id: string; name: string; userId?: string | null }[],
  meUserId: string | null
): string {
  const fromP = participants.find((p) => p.name === from);
  const toP = participants.find((p) => p.name === to);
  if (fromP && toP) {
    return linhaAcertoHumana(from, to, valor, fromP.id, toP.id, participants, meUserId);
  }
  const r = valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${from} precisa pagar R$ ${r} para ${to}`;
}

export const CONFIRMA_ESTORNO =
  "Tem certeza?\n\nO estorno desfaz parte do que foi registrado como pago. Os saldos vão mudar, mas tudo fica no histórico.";

export const CONFIRMA_QUITADO =
  "Tem certeza?\n\nVai marcar este acerto como totalmente pago (sem registrar valor parcial antes). Você pode reabrir depois se precisar ajustar.";

export const CONFIRMA_FECHAR_MES =
  "Tem certeza?\n\nVamos guardar um “retrato” dos saldos deste mês para consulta. Nada some — despesas e pagamentos continuam iguais.";

export const MICRO_CONFIANCA =
  "Seus dados ficam guardados com segurança. Nada é apagado sem você pedir. Você pode corrigir ou ajustar depois.";

export const INTRO_CONTA =
  "Aqui você vê quem pagou o quê nas despesas e quem ainda precisa acertar com quem. Tudo em linguagem simples.";
