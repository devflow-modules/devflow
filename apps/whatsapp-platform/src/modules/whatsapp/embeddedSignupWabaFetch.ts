/**
 * Lista WABAs e números após o OAuth, usando **exclusivamente** o token de utilizador do Embedded Signup.
 * Não ler `WHATSAPP_ACCESS_TOKEN`, System User nem qualquer helper de {@link operationalWhatsappAccessToken}.
 */

import {
  buildEmbeddedSignupWabaFailureDiagnosis,
  buildEmbeddedSignupWabaRequestLog,
  classifyEmbeddedSignupWabaFailure,
  tryParseMetaGraphError,
} from "./embeddedSignupDiagnostics";
import {
  buildAssignedWhatsappBusinessAccountsUrl,
  getMetaGraphBase,
} from "./embeddedSignupGraphQueries";
import type { EmbeddedSignupUserAccessToken } from "./embeddedSignupUserAccessToken";
import { maskAccessTokenForLog } from "./embeddedSignupLogRedact";

export type EmbeddedSignupPhoneRow = {
  phoneNumberId: string;
  displayPhoneNumber: string;
  wabaId: string;
  accessToken: string;
  businessId?: string;
};

type AssignedWabaGraphRow = {
  id: string;
  name?: string;
  business_id?: string;
  phone_numbers?: {
    data?: Array<{
      id: string;
      display_phone_number?: string;
      verified_name?: string;
    }>;
  };
};

/**
 * `GET /me/assigned_whatsapp_business_accounts` com o token de utilizador OAuth (não token de sistema/env).
 */
export async function fetchWabaUsingEmbeddedSignupUserToken(args: {
  userAccessToken: EmbeddedSignupUserAccessToken;
  appId: string;
  configId: string;
}): Promise<EmbeddedSignupPhoneRow[]> {
  const { userAccessToken, appId, configId } = args;
  const graphBase = getMetaGraphBase();
  const wabaListUrl = buildAssignedWhatsappBusinessAccountsUrl(graphBase);

  const wabaRequestLog = {
    ...buildEmbeddedSignupWabaRequestLog({
      graphApiBase: graphBase,
      embeddedSignupConfigId: configId,
      appId,
    }),
    stage: "embedded_signup_waba_fetch" as const,
    tokenSource: "oauth_user_token" as const,
    tokenFingerprint: maskAccessTokenForLog(userAccessToken),
  };

  console.info("[WHATSAPP][EmbeddedSignup]", JSON.stringify(wabaRequestLog));
  console.info("[WHATSAPP][EmbeddedSignup] waba_list_url", wabaListUrl);

  const wabasRes = await fetch(wabaListUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });

  const wabaRaw = await wabasRes.text();
  const graphErrFromBody = tryParseMetaGraphError(wabaRaw);

  if (!wabasRes.ok || graphErrFromBody) {
    const cause = classifyEmbeddedSignupWabaFailure(graphErrFromBody, wabasRes.status);
    const diagnosis = buildEmbeddedSignupWabaFailureDiagnosis({
      cause,
      parsed: graphErrFromBody,
    });
    console.error(
      "[WHATSAPP][EmbeddedSignup] waba_list_failed",
      JSON.stringify({
        ...wabaRequestLog,
        endpoint: wabaListUrl,
        httpStatus: wabasRes.status,
        graphError: graphErrFromBody,
        error_subcode: graphErrFromBody?.error_subcode ?? null,
        fbtrace_id: graphErrFromBody?.fbtrace_id ?? null,
        diagnosis,
        bodyPreview: wabaRaw.slice(0, 4000),
      })
    );
    const hint = graphErrFromBody?.fbtrace_id
      ? ` fbtrace_id=${graphErrFromBody.fbtrace_id}`
      : "";
    const msg =
      graphErrFromBody?.message ??
      (wabaRaw ? wabaRaw.slice(0, 500) : `HTTP ${wabasRes.status}`);
    const opsHint =
      cause === "graph_permission_denied"
        ? " Verifique escopos do app (Access Token Debugger), config_id no App Dashboard e papel do utilizador no Business Manager."
        : " Verifique META_API_VERSION e o corpo do erro nos logs do servidor.";
    throw new Error(`Falha ao buscar WABA (${cause}): ${msg}.${hint}${opsHint}`);
  }

  console.info(
    "[WHATSAPP][EmbeddedSignup]",
    JSON.stringify({
      stage: "embedded_signup_waba_fetch",
      tokenSource: "oauth_user_token",
      tokenFingerprint: maskAccessTokenForLog(userAccessToken),
      httpStatus: wabasRes.status,
      bodyPreview: wabaRaw.slice(0, 8000),
    })
  );

  let wabaData: { data?: AssignedWabaGraphRow[]; error?: { message?: string } };
  try {
    wabaData = JSON.parse(wabaRaw) as {
      data?: AssignedWabaGraphRow[];
      error?: { message?: string };
    };
  } catch {
    throw new Error("Resposta inválida ao listar WABAs");
  }

  if (wabaData.error?.message) {
    const graphErr = tryParseMetaGraphError(wabaRaw);
    const cause = classifyEmbeddedSignupWabaFailure(graphErr, 200);
    const diagnosis = buildEmbeddedSignupWabaFailureDiagnosis({ cause, parsed: graphErr });
    console.error(
      "[WHATSAPP][EmbeddedSignup] waba_list_error_in_body",
      JSON.stringify({ ...wabaRequestLog, graphError: graphErr, diagnosis })
    );
    throw new Error(wabaData.error.message);
  }

  const accounts = wabaData.data ?? [];
  const result: EmbeddedSignupPhoneRow[] = [];
  const tokenString = userAccessToken as string;

  for (const waba of accounts) {
    const phones = waba.phone_numbers?.data ?? [];
    for (const p of phones) {
      if (p.id) {
        result.push({
          phoneNumberId: p.id,
          displayPhoneNumber: p.display_phone_number ?? p.id,
          wabaId: waba.id,
          accessToken: tokenString,
          businessId: waba.business_id,
        });
      }
    }
  }

  if (result.length === 0) {
    throw new Error(
      "Nenhum número WhatsApp encontrado na conta. Conecte um número no Meta Business Suite."
    );
  }

  return result;
}
