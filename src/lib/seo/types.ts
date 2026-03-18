export type SeoTool = "divisao" | "cnpj";

export type SeoPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  useCase: string;
  tool: SeoTool;
  related: string[];
};
