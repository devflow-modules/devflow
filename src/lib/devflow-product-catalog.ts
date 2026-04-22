import { FINANCEIRO_BASE_PATH, FINANCEIRO_DEMO_PATH } from "@devflow/financeiro-routes";

/** Produtos expostos no catálogo público (header, /produtos). */
export type DevflowProductId = "whatsapp_platform" | "financeiro";

export type DevflowCatalogProduct = {
  id: DevflowProductId;
  /** Chave estável para analytics */
  navItemKey: string;
  name: string;
  /** Uma linha — dropdown e mobile */
  summary: string;
  /** Card na página /produtos */
  cardPitch: string;
  /** “Para quem é” */
  audience: string;
  /** Destino principal do CTA “Abrir” / produto */
  href: string;
  demoHref?: string;
  featured: boolean;
  badge?: string;
};

/**
 * Catálogo público alinhado ao lançamento: WhatsApp Platform e Financeiro.
 */
export const DEVFLOW_PRODUCT_CATALOG: DevflowCatalogProduct[] = [
  {
    id: "whatsapp_platform",
    navItemKey: "produto_whatsapp",
    name: "WhatsApp Platform",
    summary: "Automatize atendimento e vendas no WhatsApp",
    cardPitch: "Transforme volume de mensagens em operação previsível.",
    audience: "Negócios que vivem de WhatsApp e precisam de métricas e controle.",
    href: "/produtos/whatsapp-platform",
    featured: true,
    badge: "Principal",
  },
  {
    id: "financeiro",
    navItemKey: "produto_financeiro",
    name: "Financeiro",
    summary: "Veja score, insights e checklist do mês em um painel só",
    cardPitch: "Organize seu mês com clareza e ação — sem planilha solta.",
    audience: "Quem quer controle real de PF, PJ ou casa, com próximo passo óbvio.",
    href: FINANCEIRO_BASE_PATH,
    demoHref: FINANCEIRO_DEMO_PATH,
    featured: false,
  },
];

export const PRODUTOS_HUB_PATH = "/produtos";
