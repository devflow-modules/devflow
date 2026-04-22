import { FINANCEIRO_BASE_PATH, FINANCEIRO_DEMO_PATH } from "@devflow/financeiro-routes";

export type DevflowProductId = "financeiro" | "whatsapp_platform" | "investigamais" | "funklab";

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
 * Ordem: WhatsApp Platform primeiro (foco de lançamento); Financeiro e demais seguem.
 * Textos: verbo + resultado (evitar genéricos).
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
  {
    id: "investigamais",
    navItemKey: "produto_investigamais",
    name: "Investigamais",
    summary: "Consulte e valide dados com rapidez",
    cardPitch: "Investigação e validação com fluxo guiado e demo visível.",
    audience: "Quem precisa checar pessoas, empresas ou cenários com rapidez.",
    href: "/produtos/investigamais",
    featured: false,
  },
  {
    id: "funklab",
    navItemKey: "produto_funklab",
    name: "FunkLab",
    summary: "Gere grooves e sketches em segundos para sua produção",
    cardPitch: "Da ideia ao MIDI exportável, com demo ao vivo na página.",
    audience: "Produtores e estúdios que querem agilidade na criação musical.",
    href: "/produtos/funklab-studio",
    featured: false,
  },
];

export const PRODUTOS_HUB_PATH = "/produtos";
