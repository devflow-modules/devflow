/** E.164-like: apenas dígitos para chave de conversa */
export function normalizeWaPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function metaTimestampToDate(ts?: string | null): Date {
  if (!ts) return new Date();
  const n = parseInt(ts, 10);
  if (!Number.isNaN(n) && n > 0 && n < 1e11) {
    return new Date(n * 1000);
  }
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function previewText(text: string, max = 200): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}
