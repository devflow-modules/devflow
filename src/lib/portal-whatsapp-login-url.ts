import { whatsappAppUrl } from "@/lib/whatsapp-app-url";

function splitPathAndQuery(value: string): { pathOnly: string; querySuffix: string } {
  const i = value.indexOf("?");
  if (i === -1) return { pathOnly: value, querySuffix: "" };
  return { pathOnly: value.slice(0, i), querySuffix: value.slice(i) };
}

/**
 * Valida `next` antes de o portal colocar em `whatsappAppUrl(/login?next=...)`.
 * Alinhado às regras do app WhatsApp (`isSafeInternalNextPath`), com decode do pathname
 * para apanhar variantes codificadas (ex. %2F%2F).
 */
export function isSafePortalNextPathForWhatsappLogin(next: string): boolean {
  if (next.length === 0 || next !== next.trim()) return false;
  if (/\s/.test(next)) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("\\") || next.includes("\0")) return false;

  const { pathOnly } = splitPathAndQuery(next);
  let decodedPath = pathOnly;
  try {
    decodedPath = decodeURIComponent(pathOnly);
  } catch {
    return false;
  }
  if (decodedPath.includes("//")) return false;
  if (decodedPath.includes("\\") || decodedPath.includes("\0")) return false;

  const firstSeg = decodedPath.split("/")[1] ?? "";
  if (firstSeg.includes(":")) return false;

  return true;
}

/** URL de login no app WhatsApp; `next` só se for path interno seguro. */
export function whatsappAppLoginUrlWithNext(nextPath: string | null | undefined): string {
  const loginOnly = whatsappAppUrl("/login");
  if (typeof nextPath !== "string" || !isSafePortalNextPathForWhatsappLogin(nextPath)) {
    return loginOnly;
  }
  return whatsappAppUrl(`/login?next=${encodeURIComponent(nextPath)}`);
}
