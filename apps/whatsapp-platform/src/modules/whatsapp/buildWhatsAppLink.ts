/**
 * Link wa.me para abrir conversa com número internacional (E.164 sem +).
 * Não usar phone_number_id da Meta — apenas dígitos do número real (ex.: display).
 */

export function normalizePhoneDigitsForWaMe(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * @param phoneNumber — número com ou sem +, espaços, tracos (E.164 ou nacional com DDI)
 * @param message — texto opcional pré-preenchido
 */
export function buildWhatsAppLink(params: { phoneNumber: string; message?: string }): string {
  const n = normalizePhoneDigitsForWaMe(params.phoneNumber);
  if (!n) {
    return "https://wa.me/";
  }
  const base = `https://wa.me/${n}`;
  const msg = params.message?.trim();
  if (msg) {
    return `${base}?text=${encodeURIComponent(msg)}`;
  }
  return base;
}
