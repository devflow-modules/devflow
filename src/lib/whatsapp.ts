/**
 * Helper para gerar links do WhatsApp a partir das variáveis de ambiente.
 * Formato: https://wa.me/{número}?text={mensagem}
 */

const WHATSAPP_BASE_URL = "https://wa.me";

const DEFAULT_CONTACT_EMAIL = "contato@devflowlabs.com.br";

function cleanWhatsAppDigits(): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  return number?.replace(/\D/g, "") ?? "";
}

/**
 * Indica se wa.me pode ser montado (número público configurado no build).
 */
export function isWhatsAppNumberConfigured(): boolean {
  return cleanWhatsAppDigits().length > 0;
}

function buildMailtoUrl(text?: string): string {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? DEFAULT_CONTACT_EMAIL;
  const defaultText =
    process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_TEXT ?? "Olá, gostaria de mais informações.";
  const message = text ?? defaultText;
  const subject = encodeURIComponent("Contato — DevFlow Labs");
  const body = encodeURIComponent(message);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

/**
 * Gera a URL do WhatsApp com número e mensagem opcional.
 * Usa NEXT_PUBLIC_WHATSAPP_NUMBER e NEXT_PUBLIC_WHATSAPP_DEFAULT_TEXT do .env.local
 * @returns `"#"` se o número não estiver configurado (legado; prefira getWhatsAppOrMailtoUrl nos CTAs).
 */
export function getWhatsAppUrl(text?: string): string {
  const cleanNumber = cleanWhatsAppDigits();
  const defaultText =
    process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_TEXT ?? "Olá, gostaria de mais informações.";

  const message = text ?? defaultText;
  const encodedMessage = encodeURIComponent(message);

  if (!cleanNumber) {
    return "#";
  }

  return `${WHATSAPP_BASE_URL}/${cleanNumber}?text=${encodedMessage}`;
}

/**
 * URL para botões de contato no site: **wa.me** se houver número, senão **mailto**
 * (evita clique que não faz nada quando NEXT_PUBLIC_WHATSAPP_NUMBER está vazio).
 */
export function getWhatsAppOrMailtoUrl(text?: string): string {
  const wa = getWhatsAppUrl(text);
  if (wa !== "#") return wa;
  return buildMailtoUrl(text);
}
