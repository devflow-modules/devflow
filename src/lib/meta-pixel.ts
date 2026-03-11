/**
 * Meta Pixel — tracking para Meta Ads
 * Evento Contact = principal para otimização de anúncios
 */

declare global {
  interface Window {
    fbq?: (
      action: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export function trackMetaContact(): void {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Contact");
  }
}
