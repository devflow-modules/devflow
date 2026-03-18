export type GrowthTool = "divisao" | "cnpj" | "financeiro";

export type GrowthCategory = "comparative" | "problem_solution" | "use_case";

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
};
