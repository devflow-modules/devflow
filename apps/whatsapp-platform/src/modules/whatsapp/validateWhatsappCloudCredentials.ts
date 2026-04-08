/**
 * Validação leve contra a WhatsApp Cloud API (Graph) antes de persistir credenciais.
 * GET /{phone-number-id}?fields=id,display_phone_number
 */

export type WhatsappCredentialValidationFailureCode =
  | "INVALID_TOKEN"
  | "PHONE_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "NETWORK"
  | "MISMATCH"
  | "UNKNOWN";

export type ValidateWhatsappCloudCredentialsResult =
  | { ok: true; displayPhoneNumber?: string | null }
  | {
      ok: false;
      code: WhatsappCredentialValidationFailureCode;
      message: string;
    };

function graphApiVersion(): string {
  const ver = process.env.META_API_VERSION ?? process.env.WHATSAPP_API_VERSION ?? "v21.0";
  return ver.startsWith("v") ? ver : `v${ver}`;
}

/**
 * E2E / desenvolvimento: define `WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE=1` para não chamar a Meta.
 * Não usar em produção.
 */
export function shouldSkipWhatsappCloudCredentialValidate(): boolean {
  return process.env.WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE === "1";
}

export async function validateWhatsappCloudCredentials(
  phoneNumberId: string,
  accessToken: string
): Promise<ValidateWhatsappCloudCredentialsResult> {
  /** Playwright / dev: força falha sem chamar a Meta (não usar em produção). */
  if (
    process.env.NODE_ENV !== "production" &&
    accessToken.trim() === "__E2E_WHATSAPP_FORCE_INVALID__"
  ) {
    return {
      ok: false,
      code: "PERMISSION_DENIED",
      message:
        "Access Token inválido, expirado ou sem permissão para este número. Gere um token válido na Meta.",
    };
  }

  if (shouldSkipWhatsappCloudCredentialValidate()) {
    return { ok: true };
  }

  const base = `https://graph.facebook.com/${graphApiVersion()}`;
  const url = `${base}/${encodeURIComponent(phoneNumberId)}?fields=id%2Cdisplay_phone_number&access_token=${encodeURIComponent(accessToken)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      display_phone_number?: string;
      error?: { message?: string; code?: number; type?: string };
    };

    if (!res.ok) {
      const metaMsg = json.error?.message?.trim();
      const metaCode = json.error?.code;

      if (res.status === 404) {
        return {
          ok: false,
          code: "PHONE_NOT_FOUND",
          message:
            "Phone Number ID não encontrado na Meta. Confirme o ID em WhatsApp → API do app.",
        };
      }
      if (res.status === 401 || res.status === 403 || metaCode === 190 || metaCode === 102) {
        return {
          ok: false,
          code: "PERMISSION_DENIED",
          message:
            metaMsg ||
            "Access Token inválido, expirado ou sem permissão para este número. Gere um token válido na Meta.",
        };
      }
      return {
        ok: false,
        code: "UNKNOWN",
        message: metaMsg || "A Meta rejeitou o pedido de validação. Verifique o token e o Phone Number ID.",
      };
    }

    if (json.id != null && String(json.id) !== String(phoneNumberId)) {
      return {
        ok: false,
        code: "MISMATCH",
        message: "A resposta da Meta não corresponde ao Phone Number ID indicado.",
      };
    }

    return {
      ok: true,
      displayPhoneNumber: json.display_phone_number ?? null,
    };
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof Error && e.name === "AbortError") {
      return {
        ok: false,
        code: "NETWORK",
        message: "Tempo esgotado ao contactar a Meta. Tente novamente.",
      };
    }
    return {
      ok: false,
      code: "NETWORK",
      message: "Erro de rede ao validar credenciais na Meta.",
    };
  }
}
