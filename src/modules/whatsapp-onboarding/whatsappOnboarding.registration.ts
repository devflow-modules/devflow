import type { PhoneNumberListItem } from "./whatsappOnboarding.types";
import type { MappedMetaError } from "./whatsappOnboarding.types";

/**
 * Evidência segura de número já na Cloud API (envio/recebimento via API hospedada Meta).
 * Heurística oficial: platform_type === CLOUD_API após register bem-sucedido.
 * @see https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/phone_numbers/
 */
export function isCloudApiRegistered(phone: PhoneNumberListItem): boolean {
  return (phone.platform_type ?? "").toUpperCase() === "CLOUD_API";
}

export function isCodeVerifiedOnMeta(phone: PhoneNumberListItem): boolean {
  return (phone.code_verification_status ?? "").toUpperCase() === "VERIFIED";
}

/** Nome em revisão / rejeitado — só inferimos com campos explícitos quando existirem. */
export function inferNameStatusBlock(
  phone: PhoneNumberListItem & { name_status?: string }
): "PENDING" | "REJECTED" | null {
  const ns = (phone as { name_status?: string }).name_status?.toUpperCase() ?? "";
  if (ns === "DECLINED" || ns === "REJECTED") return "REJECTED";
  if (ns === "PENDING_REVIEW" || ns === "PENDING") return "PENDING";
  return null;
}

const ALREADY_PATTERNS = [
  /already\s+registered/i,
  /already\s+been\s+registered/i,
  /number\s+is\s+already/i,
  /already\s+connected/i,
];

export function isRegisterAlreadySatisfiedError(
  err: unknown,
  mapped?: MappedMetaError
): boolean {
  if (mapped?.code === "ALREADY_REGISTERED") return true;
  const msg = err instanceof Error ? err.message : String(err);
  if (ALREADY_PATTERNS.some((p) => p.test(msg))) return true;
  return false;
}
