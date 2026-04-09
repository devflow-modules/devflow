/**
 * Formato curto para UI (ex.: 550E-8400) a partir de um UUID.
 */
export function formatDebugIdForUi(uuid: string): string {
  const hex = uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
  if (hex.length < 8) return uuid.slice(0, 13).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
