const FUNKLAB_DEMO_URL =
  process.env.NEXT_PUBLIC_FUNKLAB_DEMO_URL || "https://funklab-studio.vercel.app";

export type ProjectTheme = "whatsapp" | "finance" | "music";

/**
 * Ordem = prioridade comercial. `highlight` marca o produto âncora do lançamento.
 * `isExperimental` separa o bloco "Laboratório" na UI.
 */
export const projects = [
  {
    id: "whatsapp-platform",
    title: "WhatsApp Platform",
    tagline: "A central onde atendimento vira receita",
    description:
      "Inbox oficial multiatendente, priorização por valor, automação com handoff humano e SLA visível — o produto que a DevFlow posiciona como núcleo comercial hoje.",
    badges: ["Produto principal", "API oficial", "Operação + vendas"],
    url: "/produtos/whatsapp-platform",
    theme: "whatsapp" as const,
    highlight: true,
    isExperimental: false,
    ctaLabel: "Ver produto",
  },
  {
    id: "financeiro-casa",
    title: "Financeiro Casa",
    tagline: "Fluxo de caixa com disciplina, sem planilha frágil",
    description:
      "Segundo produto ativo no ecossistema: despesas, cenários e visão mensal para PME e uso pessoal — mesma barra de engenharia, fora do epicentro de GTM atual.",
    badges: ["SaaS", "Em produção", "Ecossistema"],
    url: "/ferramentas/financeiro",
    theme: "finance" as const,
    highlight: false,
    isExperimental: false,
    ctaLabel: "Abrir ferramenta",
  },
  {
    id: "funklab-studio",
    title: "FunkLab Studio",
    tagline: "IA criativa para iteração musical",
    description:
      "Bancada de experimentação: sketches e grooves rápidos para produtores. Não entra no roadmap comercial nem compete com inbox ou financeiro.",
    badges: ["Exploração", "IA generativa"],
    url: FUNKLAB_DEMO_URL,
    theme: "music" as const,
    highlight: false,
    isExperimental: true,
    ctaLabel: "Abrir demo pública",
  },
] as const;

export type Project = (typeof projects)[number];
