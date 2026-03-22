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
    faq: [
      { q: "Como dividir conta entre amigos sem confusão?", a: "Combine antes: rateio igual ou por consumo. Use uma calculadora de divisão para ter o valor exato por pessoa. Uma pessoa paga e os outros repassam na hora (PIX) para ninguém ficar devendo." },
      { q: "E se um bebeu bem mais que os outros?", a: "Aí vale dividir por consumo: some o que cada um consumiu ou rateie bebidas à parte. Ferramentas de rateio permitem informar totais por grupo (ex.: comida vs bebida)." },
      { q: "Preciso de app para dividir conta com amigos?", a: "Não. Uma calculadora de divisão (como a da DevFlow Labs) já resolve: você informa o total e o número de pessoas, ou valores parciais, e obtém quanto cada um paga. Grátis e no navegador." },
    ],
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
    whenItMakesSense:
      "Faz sentido quando os dois trabalham e têm rendas diferentes, quando um assume mais despesas fixas (ex.: aluguel no nome de um só) ou quando vocês querem um critério objetivo para evitar discussão. Não é obrigatório: casais que ganham parecido podem manter 50/50.",
    commonMistakes:
      "Dividir tudo 50/50 mesmo com renda muito diferente deixa quem ganha menos com pouca margem. Outro erro é não listar todas as despesas compartilhadas (mercado, plano de celular, streaming) e só ratear o aluguel. Inclua tudo que os dois usam.",
    example:
      "Maria ganha R$ 4.000 e João R$ 6.000. O total de despesas compartilhadas é R$ 5.000 (aluguel, contas, mercado). A renda conjunta é R$ 10.000; Maria paga 40% (R$ 2.000) e João 60% (R$ 3.000). Assim cada um contribui na mesma proporção que a renda.",
    checklist: [
      "Liste todas as despesas compartilhadas (aluguel, contas, mercado, etc.).",
      "Some a renda líquida de cada um e calcule a fração de cada um no total.",
      "Aplique essa fração ao total de despesas para obter quanto cada um paga.",
      "Revise quando mudar renda ou despesas (novo aluguel, aumento, etc.).",
    ],
    faq: [
      {
        q: "Dividir 50/50 ou proporcional à renda?",
        a: "Proporcional à renda costuma ser mais justo quando um ganha bem mais que o outro. Quem ganha menos fica com mais folga; quem ganha mais paga uma parte maior. 50/50 faz sentido quando as rendas são parecidas.",
      },
      {
        q: "Como incluir despesas que só um tem (financiamento, plano)?",
        a: "Despesas só de uma pessoa ficam com ela. No rateio compartilhado entram só o que os dois usam: aluguel, condomínio, luz, água, internet, mercado, itens da casa.",
      },
      {
        q: "Preciso de aplicativo para dividir contas do casal?",
        a: "Não. Você pode usar uma calculadora de rateio proporcional (como a da DevFlow Labs) e anotar o resultado. O importante é ter o número fechado e revisar quando algo mudar.",
      },
    ],
    internalLinkBlurb: {
      before: "Se você mora com mais pessoas (república ou família), veja também como ",
      slug: "dividir-conta-republica",
      label: "dividir contas na república",
      after: " sem briga.",
    },
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
    whenItMakesSense:
      "Faz sentido quando o grupo é grande (4+ pessoas), quando uns pedem prato caro e outros só entrada, ou quando a conta tem gorjeta e todo mundo quer sair na mesma hora. Em dupla ou trio às vezes cada um paga o seu; em grupo maior, rateio evita conta de celular na mesa.",
    commonMistakes:
      "Esquecer a gorjeta no total antes de dividir; deixar uma pessoa pagar tudo “depois a gente te paga” e nunca fechar; dividir igual quando o consumo foi muito diferente (ex.: um só tomou água, outro pediu bottle).",
    example:
      "Seis amigos jantaram: conta total R$ 480 (já com 10% de gorjeta). Se dividir igual: R$ 80 por pessoa. Se dois não beberam e combinaram ratear só a comida: some o que os quatro consumiram e divida entre eles; os outros pagam a parte deles. Ferramenta de divisão ajuda a não errar na conta.",
    checklist: [
      "Confira se a conta já inclui gorjeta ou serviço.",
      "Decida: rateio igual ou por consumo (quem bebeu paga a parte das bebidas)?",
      "Some os itens de quem entra no rateio e divida pelo número de pessoas.",
      "Uma pessoa paga no cartão e os outros repassam na hora (PIX) para não esquecer.",
    ],
    faq: [
      {
        q: "Dividir igual ou cada um paga o que consumiu?",
        a: "Igual é mais rápido e evita discussão quando o consumo foi parecido. Por consumo é mais justo quando tem muita diferença (uns só água, outros bebida e sobremesa). Combine antes de pedir.",
      },
      {
        q: "Como incluir a gorjeta na divisão?",
        a: "Some a gorjeta ao total da conta e divida esse valor. Assim todo mundo paga a parte proporcional da gorjeta. Não deixe a gorjeta só para quem pagou no cartão.",
      },
      {
        q: "Existe ferramenta para dividir conta de restaurante?",
        a: "Sim. Calculadoras de rateio (como a de divisão de contas da DevFlow Labs) permitem informar o total e o número de pessoas, ou até ratear por valor por pessoa quando o consumo foi diferente.",
      },
    ],
    internalLinkBlurb: {
      before: "Para viagens em grupo, o mesmo raciocínio vale: veja ",
      slug: "dividir-conta-viagem",
      label: "como dividir gastos de viagem",
      after: " sem planilha infinita.",
    },
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
    faq: [
      { q: "Como calcular rateio proporcional à renda?", a: "Some a renda de todos; calcule a fração de cada um no total. Multiplique o total de despesas por essa fração. Ex.: rendas 3k e 7k (total 10k); despesas 5k. Quem ganha 3k paga 30% = R$ 1.500; quem ganha 7k paga 70% = R$ 3.500." },
      { q: "Rateio proporcional é justo?", a: "Depende do que o grupo acha justo. Para muitos casais e repúblicas é mais justo que 50/50 quando as rendas são diferentes, porque cada um contribui na mesma proporção que sua capacidade." },
      { q: "Onde fazer o cálculo de rateio proporcional?", a: "Na ferramenta de divisão de contas da DevFlow Labs você informa as rendas e o total de despesas e obtém quanto cada um paga. Grátis e sem cadastro." },
    ],
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
    faq: [
      { q: "A consulta de CNPJ online é realmente grátis?", a: "Sim. A Receita Federal disponibiliza dados básicos de CNPJ publicamente. Ferramentas como a da DevFlow Labs consultam essa base e mostram situação, razão social e outros dados em segundos, sem custo e sem cadastro." },
      { q: "Quais dados aparecem na consulta CNPJ?", a: "Razão social, nome fantasia (quando houver), situação cadastral (Ativa, Baixada, etc.), data de abertura, endereço, CNAE principal. Dados públicos para validação rápida." },
      { q: "Posso consultar CNPJ de ME e MEI?", a: "Sim. ME e MEI têm o mesmo formato de CNPJ; a consulta mostra porte (MEI, ME, EPP, etc.) e situação como para qualquer empresa." },
    ],
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
    whenItMakesSense:
      "Faz sentido antes de cadastrar fornecedor novo, antes de pagar adiantado ou quando você recebe um CNPJ que nunca viu (nota fiscal, contrato, proposta). Em compras pequenas e repetidas de quem você já conhece, às vezes não vale o tempo; para valores altos ou primeiro pedido, sempre consulte.",
    commonMistakes:
      "Confiar só no CNPJ que o fornecedor mandou sem conferir na base oficial (pode estar incorreto ou de outra empresa). Não olhar a situação cadastral: CNPJ baixado ou suspenso pode impedir emissão de nota. Cadastrar razão social errada por não conferir.",
    example:
      "Você precisa comprar insumos de um novo fornecedor que mandou CNPJ 12.345.678/0001-90. Na consulta você vê: razão social correta, situação Ativa, porte ME, endereço em São Paulo. Confere com o que está no contrato e segue. Se aparecesse «Baixada» ou razão social diferente, você não cadastraria.",
    checklist: [
      "Pegue o CNPJ informado pelo fornecedor (nota, e-mail, contrato).",
      "Consulte na base pública (Receita Federal ou ferramenta que use essa base).",
      "Confira razão social, situação (Ativa) e endereço.",
      "Só então cadastre no seu sistema e emita ordem de compra ou pague.",
    ],
    faq: [
      {
        q: "Consultar CNPJ de fornecedor é grátis?",
        a: "Sim. A Receita Federal disponibiliza dados básicos de CNPJ publicamente. Ferramentas como a da DevFlow Labs consultam essa base e mostram situação, razão social e outros dados em segundos, sem custo.",
      },
      {
        q: "O que fazer se o CNPJ estiver baixado ou suspenso?",
        a: "Não cadastre e não pague adiantado. Empresa com situação irregular pode não emitir nota ou ter problemas legais. Peça outro fornecedor ou que regularizem antes de fechar negócio.",
      },
      {
        q: "Preciso consultar CNPJ toda vez que compro do mesmo fornecedor?",
        a: "Na primeira vez, sim. Depois de cadastrado e com nota emitida corretamente, não é obrigatório consultar de novo a cada compra. Reconsulte se o fornecedor mudar de endereço, razão social ou se passar muito tempo sem comprar.",
      },
    ],
    internalLinkBlurb: {
      before: "Para saber quais dados aparecem na consulta, leia sobre ",
      slug: "dados-publicos-cnpj",
      label: "dados públicos do CNPJ",
      after: ".",
    },
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
