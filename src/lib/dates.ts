const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value);
}

/**
 * Converte YYYY-MM-DD para Date em UTC (00:00:00Z) sem Date.parse ambíguo.
 */
export function dateOnlyToUTC(value: string): Date {
  if (!assertDateOnly(value)) {
    throw new Error(`Data inválida (esperado YYYY-MM-DD): ${value}`);
  }
  const [y, m, d] = value.split("-").map((p) => Number(p));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/**
 * Normaliza Date/ISO/date-only para YYYY-MM-DD.
 * - Date: usa componentes UTC
 * - string YYYY-MM-DD: retorna como está
 * - string ISO: extrai o prefixo YYYY-MM-DD
 */
export function toDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (assertDateOnly(value)) return value;

  // ISO (ex.: 2026-02-03T00:00:00.000Z)
  if (typeof value === "string" && value.length >= 10 && assertDateOnly(value.slice(0, 10))) {
    return value.slice(0, 10);
  }

  // fallback: tenta parsear e normalizar via UTC
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data inválida: ${value}`);
  }
  return toDateOnly(parsed);
}

/**
 * Formata YYYY-MM-DD como DD/MM/YYYY sem depender de timezone do runtime.
 */
export function formatDateOnlyPtBr(value: string): string {
  const dateOnly = toDateOnly(value);
  const [y, m, d] = dateOnly.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Aceita YYYY-MM-DD (preferencial) ou ISO completo e retorna Date para persistência.
 * - YYYY-MM-DD: Date UTC 00:00Z
 * - ISO: new Date(iso)
 */
export function dateInputToDate(value: string): Date {
  if (assertDateOnly(value)) return dateOnlyToUTC(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data inválida: ${value}`);
  }
  return parsed;
}
