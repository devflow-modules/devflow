/**
 * Programmatic SEO — data layer for long-tail landing pages at `/{slug}`.
 */

import type { SeoPage, SeoTool } from "./types";
import { assertValidSeoPages } from "./validate-pages";

export type { SeoPage, SeoTool } from "./types";

export const seoPages: SeoPage[] = [
  // --- Divisão de contas ---
  {
    slug: "dividir-conta-amigos",
    title: "Dividir conta entre amigos de forma justa | DevFlow Labs",
    description:
      "Aprenda como dividir contas entre amigos sem erro, com rateio claro e cálculo automático.",
    h1: "Como dividir conta entre amigos",
    intro:
      "Dividir conta entre amigos pode gerar mal-entendidos quando cada um paga diferente ou consome em quantidades diferentes. Um rateio transparente evita discussão e deixa todo mundo alinhado.",
    useCase: "Ideal para bares, viagens, churrascos e rolês em grupo.",
    tool: "divisao",
    related: ["dividir-conta-casal", "dividir-conta-restaurante", "rateio-proporcional-renda"],
  },
  {
    slug: "dividir-conta-casal",
    title: "Dividir contas do casal proporcional à renda | DevFlow Labs",
    description:
      "Rateio justo de despesas do casal: aluguel, contas e mercado proporcionais à renda de cada um.",
    h1: "Dividir contas do casal de forma justa",
    intro:
      "Casais costumam combinar 50/50 ou um paga tudo — mas quando as rendas são diferentes, o rateio proporcional costuma ser mais equilibrado e sustentável a longo prazo.",
    useCase: "Aluguel, condomínio, mercado, contas fixas e despesas compartilhadas.",
    tool: "divisao",
    related: ["dividir-conta-amigos", "dividir-conta-republica", "rateio-proporcional-renda"],
  },
  {
    slug: "dividir-conta-restaurante",
    title: "Dividir conta no restaurante entre várias pessoas | DevFlow Labs",
    description:
      "Dicas e ferramenta para dividir conta de restaurante sem confusão, com ou sem proporção por consumo.",
    h1: "Dividir conta no restaurante",
    intro:
      "Na hora de pagar, misturar pratos, bebidas e sobremesas com gorjeta confunde qualquer um. Ter um número fechado por pessoa ou um rateio claro acelera a saída e evita atrito.",
    useCase: "Jantar em grupo, aniversários e confraternizações.",
    tool: "divisao",
    related: ["dividir-conta-amigos", "dividir-conta-viagem"],
  },
  {
    slug: "dividir-conta-republica",
    title: "Rateio de contas em república e colegas de quarto | DevFlow Labs",
    description:
      "Organize água, luz, internet e aluguel em república com divisão proporcional ou igualitária.",
    h1: "Dividir contas na república",
    intro:
      "Em república, as contas se acumulam e quem paga na frente pode se sentir prejudicado. Um esquema fixo de rateio (igual ou por quarto/renda) reduz atrito.",
    useCase: "República universitária e moradia compartilhada.",
    tool: "divisao",
    related: ["dividir-conta-casal", "rateio-proporcional-renda", "dividir-conta-amigos"],
  },
  {
    slug: "dividir-conta-viagem",
    title: "Dividir gastos de viagem em grupo | DevFlow Labs",
    description:
      "Hotel, combustível, alimentação: como fechar as contas da viagem sem planilha infinita.",
    h1: "Dividir gastos de viagem",
    intro:
      "Em viagem, uma pessoa paga o hotel, outra o carro, outra as refeições. No fim, somar tudo e dividir de forma justa evita que alguém saia no prejuízo.",
    useCase: "Viagens com amigos, família ou casais.",
    tool: "divisao",
    related: ["dividir-conta-amigos", "dividir-conta-restaurante"],
  },
  {
    slug: "rateio-proporcional-renda",
    title: "Rateio proporcional à renda: como calcular | DevFlow Labs",
    description:
      "Entenda o rateio proporcional à renda e use a calculadora para dividir despesas com justiça.",
    h1: "Rateio proporcional à renda",
    intro:
      "Quem ganha mais paga uma fração maior do total — proporcional à renda. É uma fórmula simples e muito usada por casais e colegas de moradia.",
    useCase: "Casal, república e famílias com rendas diferentes.",
    tool: "divisao",
    related: ["dividir-conta-casal", "dividir-conta-republica"],
  },
  {
    slug: "dividir-conta-familia",
    title: "Dividir despesas da casa entre familiares | DevFlow Labs",
    description:
      "Organize quem paga o quê na casa com a família: avós, filhos adultos e custos compartilhados.",
    h1: "Dividir contas na família",
    intro:
      "Famílias multigeracionais ou irmãos na mesma casa precisam de regras claras para mercado, contas e manutenção.",
    useCase: "Casa compartilhada entre parentes.",
    tool: "divisao",
    related: ["rateio-proporcional-renda", "dividir-conta-casal"],
  },

  // --- Consulta CNPJ ---
  {
    slug: "consultar-cnpj-gratis",
    title: "Consultar CNPJ grátis online | DevFlow Labs",
    description:
      "Consulte CNPJ sem custo: situação cadastral, razão social e dados públicos da Receita Federal em segundos.",
    h1: "Consultar CNPJ grátis",
    intro:
      "Validar um CNPJ antes de comprar ou contratar não precisa ser pago. A consulta pública reúne informações essenciais para decidir com segurança.",
    useCase: "Compradores, MEI, pequenas empresas e quem valida fornecedores no dia a dia.",
    tool: "cnpj",
    related: ["consultar-cnpj-online-gratis", "verificar-situacao-cnpj"],
  },
  {
    slug: "consultar-cnpj-online-gratis",
    title: "Consultar CNPJ online grátis | DevFlow Labs",
    description:
      "Consulte dados públicos de CNPJ em segundos: situação cadastral, razão social e mais.",
    h1: "Consultar CNPJ online grátis",
    intro:
      "Antes de fechar negócio ou cadastrar fornecedor, conferir o CNPJ na Receita Federal reduz risco de fraude e inadimplência.",
    useCase: "Compras B2B, cadastro de fornecedores e due diligence rápida.",
    tool: "cnpj",
    related: ["consultar-cnpj-gratis", "consultar-cnpj-antes-comprar"],
  },
  {
    slug: "verificar-situacao-cnpj",
    title: "Verificar situação cadastral do CNPJ | DevFlow Labs",
    description:
      "Saiba se o CNPJ está ativo, suspenso ou baixado antes de assinar contratos ou pagar adiantado.",
    h1: "Verificar situação do CNPJ",
    intro:
      "CNPJ com situação irregular pode indicar empresa inativa ou com pendências. A consulta pública mostra o status atualizado.",
    useCase: "Contratos, pagamentos antecipados e parcerias.",
    tool: "cnpj",
    related: ["consultar-cnpj-online-gratis", "consultar-cnpj-fornecedor"],
  },
  {
    slug: "consultar-cnpj-fornecedor",
    title: "Consultar CNPJ de fornecedor antes de comprar | DevFlow Labs",
    description:
      "Valide fornecedor por CNPJ: dados cadastrais e situação para compras seguras.",
    h1: "Consultar CNPJ de fornecedor",
    intro:
      "Compras para empresa ou MEI exigem nota e CNPJ confiável. Uma consulta rápida evita cair em golpes ou duplicidade de cadastro.",
    useCase: "Compras corporativas, MEI e pequenos negócios.",
    tool: "cnpj",
    related: ["consultar-cnpj-online-gratis", "dados-publicos-cnpj"],
  },
  {
    slug: "consultar-cnpj-antes-comprar",
    title: "Consultar CNPJ antes de comprar pela internet | DevFlow Labs",
    description:
      "Confira se a loja ou prestador tem CNPJ ativo antes de pagar online.",
    h1: "Consultar CNPJ antes de comprar",
    intro:
      "Lojas virtuais sérias informam CNPJ. Cruzar com a base oficial ajuda a decidir com mais segurança.",
    useCase: "Compras online, marketplaces e serviços digitais.",
    tool: "cnpj",
    related: ["verificar-situacao-cnpj", "consultar-cnpj-gratis"],
  },
  {
    slug: "dados-publicos-cnpj",
    title: "Quais dados públicos aparecem na consulta CNPJ | DevFlow Labs",
    description:
      "Entenda o que a Receita Federal disponibiliza publicamente ao consultar um CNPJ.",
    h1: "Dados públicos do CNPJ",
    intro:
      "Razão social, situação cadastral, endereço e atividades são exemplos de informações públicas úteis para validação.",
    useCase: "Pesquisa de empresas e conformidade básica.",
    tool: "cnpj",
    related: ["consultar-cnpj-online-gratis", "consultar-cnpj-fornecedor"],
  },
  {
    slug: "consultar-cnpj-me",
    title: "Consultar CNPJ de ME e MEI | DevFlow Labs",
    description:
      "Verifique microempresa e MEI: situação e dados cadastrais em segundos.",
    h1: "Consultar CNPJ de ME e MEI",
    intro:
      "ME e MEI têm o mesmo formato de CNPJ; a consulta pública mostra porte e situação como qualquer empresa.",
    useCase: "Validação de prestadores autônomos e pequenos negócios.",
    tool: "cnpj",
    related: ["dados-publicos-cnpj", "verificar-situacao-cnpj"],
  },
];

assertValidSeoPages(seoPages);

export const seoPageSlugs = seoPages.map((p) => p.slug);

export function getSeoPageBySlug(slug: string): SeoPage | undefined {
  return seoPages.find((p) => p.slug === slug);
}

export function getRelatedPages(slug: string): SeoPage[] {
  const page = getSeoPageBySlug(slug);
  if (!page) return [];
  return page.related
    .map((s) => getSeoPageBySlug(s))
    .filter((p): p is SeoPage => p !== undefined);
}

export function getSeoPagesByTool(tool: SeoTool): SeoPage[] {
  return seoPages.filter((p) => p.tool === tool);
}
