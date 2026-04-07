/**
 * Mapeia respostas das APIs de auth para mensagens estáveis na UI.
 * Códigos opcionais vêm do backend (`code`) quando existirem.
 */
export function mapAuthHttpError(
  status: number,
  data: { error?: string; code?: string; message?: string }
): string {
  const fallback = data.error ?? data.message;

  if (status === 429) {
    return (
      fallback ??
      "Muitas tentativas a partir deste dispositivo ou rede. Aguarde alguns minutos e tente novamente."
    );
  }

  if (status === 403) {
    return fallback ?? "Acesso negado. Não tem permissão para esta operação.";
  }

  switch (data.code) {
    case "INVALID_CREDENTIALS":
      return "E-mail ou senha incorretos. Verifique e tente novamente.";
    case "RATE_LIMITED":
      return (
        fallback ??
        "Muitas tentativas. Aguarde alguns minutos."
      );
    case "RESET_TOKEN_EXPIRED":
      return "Este link de redefinição expirou. Peça um novo e-mail em «Esqueci minha senha».";
    case "RESET_TOKEN_INVALID":
      return "Este link não é válido. Peça um novo e-mail ou copie o endereço completo do e-mail.";
    default:
      break;
  }

  if (status === 401 && fallback) return fallback;
  if (status === 400 && fallback) return fallback;
  if (status === 409 && fallback) return fallback;
  if (status === 503 && fallback) return fallback;

  return fallback ?? "Não foi possível concluir o pedido. Tente novamente.";
}
