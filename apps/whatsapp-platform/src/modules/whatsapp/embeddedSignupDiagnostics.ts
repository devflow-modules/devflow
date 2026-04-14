/**
 * Diagnóstico de erros de permissão no pós-OAuth do Embedded Signup (lista de WABAs).
 *
 * ## Configuração Embedded Signup (`config_id`)
 * - Valor de `META_EMBEDDED_SIGNUP_CONFIG_ID` / `WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID`: deve ser o **Configuration ID**
 *   criado em Meta App → **WhatsApp** → **API Setup** / fluxo de Embedded Signup (não confundir com App ID).
 * - O `config_id` escolhido no App deve corresponder ao fluxo (ex.: coexistência vs só Cloud API) que o frontend abre.
 *
 * ## Permissões e token (após troca `code` → `access_token`)
 * O GET `/{version}/me/assigned_whatsapp_business_accounts` usa o **token de utilizador** emitido no OAuth.
 * Esse token precisa de escopos/grants compatíveis com WhatsApp Business, por exemplo (nomes podem variar ligeiramente na UI):
 * - `whatsapp_business_management`
 * - `whatsapp_business_messaging`
 * - **`business_management`** — com frequência **obrigatório** para `GET /me/assigned_whatsapp_business_accounts`; sem ele o token pode ter só `whatsapp_*` + `public_profile` e falhar com código 10 (ex. subcode 1752203)
 *
 * **Diferenciar causas (operacional):**
 * - **App / integração:** escopos não aprovados no App, Embedded Signup mal configurado, app em modo dev sem testers — costuma aparecer como Graph **code 10** (Permission).
 * - **Utilizador / BM:** conta Facebook sem papel suficiente na WABA/BM (ex.: não admin) — também **code 10**, mas o token pode estar “válido” no Debugger porém sem direito àquele recurso.
 * - **Mismatch app ↔ token:** token de outro `client_id` ou fluxo OAuth diferente do app que detém o `config_id` — verificar `client_id` no token (Access Token Debugger) vs `META_APP_ID`.
 *
 * Ferramentas: [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/), revisão de permissões do App no App Dashboard.
 *
 * Nota: `error_subcode` (ex.: 1752203) é definido pela Meta; use `fbtrace_id` ao abrir ticket de suporte.
 */

import { EMBEDDED_SIGNUP_ASSIGNED_WABA_FIELDS } from "./embeddedSignupGraphQueries";

/** Edge Graph usado após OAuth para listar WABAs atribuídas ao utilizador. */
export const EMBEDDED_SIGNUP_WABA_LIST_EDGE = "assigned_whatsapp_business_accounts" as const;

export function maskEmbeddedSignupConfigId(configId: string): string {
  const t = configId.trim();
  if (t.length <= 8) return "***";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export type ParsedMetaGraphError = {
  message: string;
  code?: number;
  error_subcode?: number;
  type?: string;
  fbtrace_id?: string;
  error_user_title?: string;
  error_user_msg?: string;
};

export function tryParseMetaGraphError(raw: string): ParsedMetaGraphError | null {
  try {
    const j = JSON.parse(raw) as {
      error?: {
        message?: string;
        code?: number;
        error_subcode?: number;
        type?: string;
        fbtrace_id?: string;
        error_user_title?: string;
        error_user_msg?: string;
      };
    };
    const e = j.error;
    if (!e || typeof e.message !== "string") return null;
    return {
      message: e.message,
      code: typeof e.code === "number" ? e.code : undefined,
      error_subcode: typeof e.error_subcode === "number" ? e.error_subcode : undefined,
      type: typeof e.type === "string" ? e.type : undefined,
      fbtrace_id: typeof e.fbtrace_id === "string" ? e.fbtrace_id : undefined,
      error_user_title: typeof e.error_user_title === "string" ? e.error_user_title : undefined,
      error_user_msg: typeof e.error_user_msg === "string" ? e.error_user_msg : undefined,
    };
  } catch {
    return null;
  }
}

export type EmbeddedSignupWabaFailureCause =
  | "graph_permission_denied"
  | "graph_other"
  | "parse_error";

export function classifyEmbeddedSignupWabaFailure(
  parsed: ParsedMetaGraphError | null,
  httpStatus: number
): EmbeddedSignupWabaFailureCause {
  if (parsed?.code === 10) return "graph_permission_denied";
  if (parsed?.code !== undefined && parsed.code !== 10) return "graph_other";
  if (!parsed && httpStatus === 403) return "graph_permission_denied";
  return "graph_other";
}

/**
 * Orientação para logs e suporte — não inclui segredos (apenas IDs públicos / máscaras / fbtrace_id).
 */
export function buildEmbeddedSignupWabaFailureDiagnosis(args: {
  cause: EmbeddedSignupWabaFailureCause;
  parsed: ParsedMetaGraphError | null;
}): {
  summary: string;
  likelyLayer: "app_or_integration" | "user_or_business_access" | "unknown";
  operatorChecklist: readonly string[];
} {
  const { cause, parsed } = args;
  const code = parsed?.code;
  const sub = parsed?.error_subcode;

  let likelyLayer: "app_or_integration" | "user_or_business_access" | "unknown" = "unknown";
  if (cause === "graph_permission_denied") {
    const msg = (parsed?.message ?? "").toLowerCase();
    const userMsg = (parsed?.error_user_msg ?? "").toLowerCase();
    const appLike =
      msg.includes("application") ||
      msg.includes("app does not") ||
      userMsg.includes("application");
    likelyLayer = appLike ? "app_or_integration" : "user_or_business_access";
  }

  const operatorChecklist =
    cause === "graph_permission_denied"
      ? ([
          "Confirmar scope business_management no token (Access Token Debugger ou log oauth_token_debug_snapshot). Sem ele, /me/assigned_whatsapp_business_accounts costuma falhar — alinhar Facebook Login for Business (config_id) com embeddedSignupOAuthScopes no backend.",
          "Confirmar escopos whatsapp_business_management e whatsapp_business_messaging.",
          "Confirmar que o token é do mesmo META_APP_ID / FACEBOOK_APP_ID que o Embedded Signup (config_id desse app).",
          "Confirmar papel do utilizador no Business Manager / WABA (admin ou permissões de gestão WhatsApp).",
          "Confirmar que o produto WhatsApp e o fluxo Embedded Signup estão aprovados no App (modo Live ou testers em Dev).",
        ] as const)
      : ([
          "Ver corpo JSON completo e fbtrace_id; validar versão da Graph API (META_API_VERSION).",
        ] as const);

  const summary =
    cause === "graph_permission_denied"
      ? `Permissão Graph negada (code=${code ?? "?"} subcode=${sub ?? "?"}). Camada provável: ${likelyLayer}.`
      : `Erro Graph (code=${code ?? "?"} subcode=${sub ?? "?"} status conhecido).`;

  return { summary, likelyLayer, operatorChecklist };
}

export type EmbeddedSignupWabaRequestLog = {
  phase: "assigned_whatsapp_business_accounts";
  graphApiBase: string;
  graphPath: string;
  edge: typeof EMBEDDED_SIGNUP_WABA_LIST_EDGE;
  fields: string;
  embeddedSignupConfigIdMasked: string;
  appId: string;
};

export function buildEmbeddedSignupWabaRequestLog(args: {
  graphApiBase: string;
  embeddedSignupConfigId: string;
  appId: string;
}): EmbeddedSignupWabaRequestLog {
  return {
    phase: "assigned_whatsapp_business_accounts",
    graphApiBase: args.graphApiBase,
    graphPath: `/me/${EMBEDDED_SIGNUP_WABA_LIST_EDGE}`,
    edge: EMBEDDED_SIGNUP_WABA_LIST_EDGE,
    fields: EMBEDDED_SIGNUP_ASSIGNED_WABA_FIELDS,
    embeddedSignupConfigIdMasked: maskEmbeddedSignupConfigId(args.embeddedSignupConfigId),
    appId: args.appId,
  };
}
