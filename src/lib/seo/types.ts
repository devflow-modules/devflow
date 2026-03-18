export type SeoTool = "divisao" | "cnpj";

export type SeoFaqItem = { q: string; a: string };

export type SeoPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  useCase: string;
  tool: SeoTool;
  related: string[];
  /** Anti-thin: quando essa solução faz sentido */
  whenItMakesSense?: string;
  /** Erros comuns a evitar */
  commonMistakes?: string;
  /** Exemplo prático real (1 parágrafo) */
  example?: string;
  /** Checklist rápido (bullets) */
  checklist?: string[];
  /** FAQ mínimo 3 perguntas — alto impacto SEO */
  faq?: SeoFaqItem[];
  /** Frase com link interno (anchor natural) */
  internalLinkBlurb?: { before: string; slug: string; label: string; after?: string };
};
