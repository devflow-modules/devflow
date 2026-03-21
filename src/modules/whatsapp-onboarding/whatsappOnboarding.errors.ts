import type { MappedMetaError, MetaGraphErrorBody } from "./whatsappOnboarding.types";

/** Mapeamento de erros Meta → resposta operacional (docs Meta: códigos 100, 136024, 136025, 200, etc.). */
export function mapMetaError(
  status: number,
  body: MetaGraphErrorBody | unknown
): MappedMetaError {
  const e = (body as MetaGraphErrorBody)?.error;
  const code = e?.code;
  const sub = e?.error_subcode;
  const msg = e?.message ?? "Erro desconhecido na Graph API";
  const fbtraceId = e?.fbtrace_id;
  const userMsg = e?.error_user_msg ?? e?.error_user_title;

  if (code === 190 || status === 401) {
    return {
      code: "TOKEN_INVALID_OR_EXPIRED",
      httpStatus: 401,
      message:
        "Token inválido ou expirado. Gere novo System User Token com whatsapp_business_management.",
      metaCode: code,
      fbtraceId,
    };
  }
  if (code === 200 || msg.toLowerCase().includes("permission")) {
    return {
      code: "PERMISSION_DENIED",
      httpStatus: 403,
      message:
        "Permissão negada. O token precisa de whatsapp_business_management e acesso ao WABA.",
      metaCode: code,
      metaSubcode: sub,
      fbtraceId,
    };
  }
  if (code === 136024) {
    return {
      code: "REQUEST_CODE_FAILED",
      httpStatus: 502,
      message:
        "Falha ao solicitar código (SMS/voz). Aguarde cooldown, confira método e idioma, ou use outro code_method.",
      metaCode: code,
      fbtraceId,
    };
  }
  if (code === 136025) {
    return {
      code: "VERIFY_CODE_FAILED",
      httpStatus: 400,
      message:
        "Código incorreto ou expirado. Solicite novo request_code e tente de novo.",
      metaCode: code,
      fbtraceId,
    };
  }
  if (code === 100) {
    return {
      code: "INVALID_PARAMETER",
      httpStatus: 400,
      message: userMsg ?? msg,
      metaCode: code,
      fbtraceId,
    };
  }
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      httpStatus: 429,
      message: "Rate limit Meta. Aguarde e tente novamente.",
      fbtraceId,
    };
  }
  if (status >= 500) {
    return {
      code: "META_UNAVAILABLE",
      httpStatus: 502,
      message: "Graph API indisponível ou erro transitório. Tente novamente.",
      metaCode: code,
      fbtraceId,
    };
  }
  if (
    msg.toLowerCase().includes("already") ||
    msg.toLowerCase().includes("registered")
  ) {
    return {
      code: "ALREADY_REGISTERED",
      httpStatus: 409,
      message:
        "Número pode já estar registrado neste WABA. Consulte status no Gerenciador.",
      metaCode: code,
      fbtraceId,
    };
  }

  return {
    code: "META_GRAPH_ERROR",
    httpStatus: status >= 400 && status < 600 ? status : 502,
    message: userMsg ?? msg,
    metaCode: code,
    metaSubcode: sub,
    fbtraceId,
  };
}
