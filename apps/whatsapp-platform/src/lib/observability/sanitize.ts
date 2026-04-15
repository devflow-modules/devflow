const OMIT_KEY_SUBSTR = ["password", "token", "cookie", "secret", "authorization", "hash"];

const PHONE_KEY_SUBSTR = ["phone", "msisdn", "wa_from", "mobile", "telefone", "whatsapp"];
const DOCUMENT_KEY_SUBSTR = ["cpf", "cnpj", "document", "nationalid", "tax"];

/** Mascara telefone / E.164 para logs (mantém prefixo e sufixo curtos). */
export function maskPhoneLike(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length < 6) return "***";
  if (d.length <= 10) return `${d.slice(0, 3)}***${d.slice(-2)}`;
  return `${d.slice(0, 4)}***${d.slice(-3)}`;
}

/** Mascara sequência numérica longa (CPF/CNPJ em texto). */
export function maskDocumentLike(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length < 8) return "***";
  return `${d.slice(0, 3)}***${d.slice(-2)}`;
}

function sanitizeValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (typeof value === "string") {
    if (PHONE_KEY_SUBSTR.some((p) => lower.includes(p)) || lower === "from" || lower === "to") {
      return maskPhoneLike(value);
    }
    if (DOCUMENT_KEY_SUBSTR.some((p) => lower.includes(p))) {
      return maskDocumentLike(value);
    }
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11 && /^[0-9]+$/.test(digits)) {
      return maskDocumentLike(value);
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return sanitizeLogData(value as Record<string, unknown>);
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "object" && item !== null
        ? sanitizeLogData(item as Record<string, unknown>)
        : item
    );
  }
  return value;
}

export function sanitizeLogData(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (OMIT_KEY_SUBSTR.some((o) => lower.includes(o))) continue;
    out[k] = sanitizeValue(k, v);
  }
  return out;
}
