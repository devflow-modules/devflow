/**
 * Slugs that must never be used for programmatic SEO pages at `/{slug}`.
 * Covers app routes and sensitive paths to avoid conflicts and shadowing.
 */
export const reservedSlugs = [
  "admin",
  "api",
  "automacao-whatsapp",
  "automacao-whatsapp-clinica",
  "automacao-whatsapp-loja",
  "automacao-whatsapp-restaurante",
  "automacao-whatsapp-tabacaria",
  "billing",
  "blog",
  "chatbot-whatsapp",
  "contato",
  "cookies",
  "demo",
  "ferramentas",
  "precos",
  "pricing",
  "privacidade",
  "produtos",
  "projetos",
  "sobre",
  "software-atendimento-whatsapp",
  "termos",
  "upgrade",
] as const;

export const reservedSlugSet = new Set<string>(
  reservedSlugs.map((s) => s.toLowerCase())
);

export function isReservedSlug(slug: string): boolean {
  return reservedSlugSet.has(slug.toLowerCase());
}
