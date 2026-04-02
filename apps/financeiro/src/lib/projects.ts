import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";

const FUNKLAB_DEMO_URL =
  process.env.NEXT_PUBLIC_FUNKLAB_DEMO_URL || "https://funklab-studio.vercel.app";

export const projects = [
  {
    id: "funklab-studio",
    title: "FunkLab Studio",
    tagline: "Produção musical com IA em segundos",
    description:
      "Gere sketches, basslines e grooves automaticamente. Software para produtores que querem iterar rápido.",
    badges: ["AI", "Automation", "Produto próprio"],
    url: FUNKLAB_DEMO_URL,
    theme: "music" as const,
  },
  {
    id: "financeiro-casa",
    title: "Financeiro Casa",
    tagline: "Controle financeiro simples e visual",
    description:
      "Organize despesas, simule cenários e acompanhe o fluxo mensal. Ferramenta para quem quer clareza.",
    badges: ["SaaS", "Ferramentas financeiras"],
    url: FINANCEIRO_BASE_PATH,
    theme: "finance" as const,
  },
] as const;
