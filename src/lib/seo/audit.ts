/**
 * Auditoria de conteúdo — páginas fracas (thin / duplicate / weak intent)
 * e lista de URLs prioritárias para indexação manual no Search Console.
 */

import { seoPageSlugs } from "./pages";
import { growthPageSlugs } from "./growth-pages";

export type WeakIssue = "thin" | "duplicate" | "weak_intent";

export type WeakPage = {
  slug: string;
  issue: WeakIssue;
  /** Estimativa de palavras (intro + useCase + opcionais) — alvo mínimo ~500 */
  wordCount?: number;
  note?: string;
};

/** Páginas SEO/growth com conteúdo potencialmente fino ou pouco diferenciado. */
export const weakPages: WeakPage[] = [
  // Divisão — risco de duplicação entre variantes
  { slug: "dividir-conta-amigos", issue: "thin", note: "Intro + useCase curtos; falta cenário único" },
  { slug: "dividir-conta-casal", issue: "duplicate", note: "Muito próximo de rateio-proporcional-renda" },
  { slug: "dividir-conta-restaurante", issue: "thin", note: "Pouco conteúdo; sem exemplo prático" },
  { slug: "dividir-conta-republica", issue: "thin", note: "Pode ganhar checklist e FAQ" },
  { slug: "dividir-conta-viagem", issue: "thin", note: "Cenário forte mas texto curto" },
  { slug: "rateio-proporcional-renda", issue: "duplicate", note: "Sobreposição com dividir-conta-casal" },
  { slug: "dividir-conta-familia", issue: "weak_intent", note: "Diferenciação fraca vs casal/república" },
  // CNPJ — várias páginas com intenção similar
  { slug: "consultar-cnpj-gratis", issue: "duplicate", note: "Próximo de consultar-cnpj-online-gratis" },
  { slug: "consultar-cnpj-online-gratis", issue: "thin", note: "Texto curto; falta quando usar e erros" },
  { slug: "verificar-situacao-cnpj", issue: "thin", note: "Boa intenção; expandir com FAQ" },
  { slug: "consultar-cnpj-fornecedor", issue: "thin", note: "Cenário claro; falta exemplo e checklist" },
  { slug: "consultar-cnpj-antes-comprar", issue: "duplicate", note: "Sobreposição com fornecedor" },
  { slug: "dados-publicos-cnpj", issue: "thin", note: "Conteúdo técnico; pode ter FAQ" },
  { slug: "consultar-cnpj-me", issue: "weak_intent", note: "ME/MEI muito próximo de outras consultas" },
];

/** Slugs que estão na lista fraca (para checagem). */
export const weakSlugsSet = new Set(weakPages.map((w) => w.slug));

/** URLs prioritárias para inspeção e envio manual no Google Search Console. Inclui pilares (autoridade temática). */
export const priorityUrls: string[] = [
  "/",
  "/ferramentas",
  "/ferramentas/financeiro",
  "/ferramentas/divisao-de-contas",
  "/ferramentas/consulta-cnpj",
  "/controle-financeiro-completo",
  "/como-organizar-financas-pessoais",
  "/melhor-app-para-controlar-financas",
  "/planilha-vs-app-financeiro",
  "/melhor-forma-de-controlar-financas",
  "/como-controlar-gastos-mensais",
  "/dividir-conta-casal",
  "/dividir-conta-republica",
  "/rateio-proporcional-renda",
  "/consultar-cnpj-fornecedor",
  "/consultar-cnpj-gratis",
  "/automacao-whatsapp",
  "/blog",
];

/** Gera URLs completas para uso no Search Console (inserção em lote). */
export function getPriorityFullUrls(baseUrl: string = "https://devflowlabs.com.br"): string[] {
  return priorityUrls.map((path) => `${baseUrl}${path}`);
}
