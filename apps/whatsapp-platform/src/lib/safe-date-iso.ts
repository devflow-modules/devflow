/**
 * Serialização segura de `Date` para ISO (RSC, mapeamento server → props).
 * `Date.prototype.toISOString()` lança `RangeError` quando `getTime()` é `NaN`.
 */
export function safeDateToIsoString(value: Date | null | undefined): string | null {
  if (value == null) return null;
  const ms = value.getTime();
  return Number.isFinite(ms) ? value.toISOString() : null;
}
