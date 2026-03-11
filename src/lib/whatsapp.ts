/**
 * Helper para gerar links do WhatsApp a partir das variáveis de ambiente.
 * Formato: https://wa.me/{número}?text={mensagem}
 */

const WHATSAPP_BASE_URL = "https://wa.me";

/**
 * Gera a URL do WhatsApp com número e mensagem opcional.
 * Usa NEXT_PUBLIC_WHATSAPP_NUMBER e NEXT_PUBLIC_WHATSAPP_DEFAULT_TEXT do .env.local
 */
export function getWhatsAppUrl(text?: string): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const defaultText =
    process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_TEXT ?? "Olá, gostaria de mais informações.";

  const cleanNumber = number?.replace(/\D/g, "") ?? "";
  const message = text ?? defaultText;
  const encodedMessage = encodeURIComponent(message);

  if (!cleanNumber) {
    return "#";
  }

  return `${WHATSAPP_BASE_URL}/${cleanNumber}?text=${encodedMessage}`;
}
