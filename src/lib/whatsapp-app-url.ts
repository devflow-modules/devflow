/**
 * URL absoluta do deploy canónico do WhatsApp Platform (`NEXT_PUBLIC_WHATSAPP_APP_URL`).
 * Sem env, devolve path relativo (monólito local ou até cutover completo).
 */
export function whatsappAppUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = process.env.NEXT_PUBLIC_WHATSAPP_APP_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}${normalized}` : normalized;
}
