export type GrowthTool = "divisao" | "cnpj" | "financeiro";

export type GrowthCategory = "comparative" | "problem_solution" | "use_case";

export type GrowthFaqItem = { q: string; a: string };

export type GrowthPage = {
  slug: string;
  category: GrowthCategory;
  title: string;
  description: string;
  h1: string;
  intro: string;
  problem: string;
  solution: string;
  steps: string[];
  tool: GrowthTool;
  related: string[];
  /** Exibe tabela Planilha × App comum × DevFlow */
  showComparison: boolean;
  /** Cenários reais (comparativos) ou contexto adicional */
  scenarios: string;
  /** FAQ mínimo 3 perguntas — alto impacto SEO e rich results */
  faq?: GrowthFaqItem[];
  /** Seções extras para pilares (comparações, exemplos, blocos escaneáveis) */
  extraSections?: { title: string; content: string }[];
  /** Se preenchido, esta página é cluster e deve linkar para o pilar */
  pillarSlug?: string;
};
