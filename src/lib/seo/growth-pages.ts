import type { GrowthPage } from "./growth-types";
import { isReservedSlug } from "./reserved-slugs";
import { seoPageSlugs } from "./pages";

export type { GrowthPage, GrowthCategory, GrowthTool } from "./growth-types";

function assertGrowthPages(pages: GrowthPage[]): void {
  const seen = new Set<string>();
  const bySlug = new Map<string, GrowthPage>();

  for (const p of pages) {
    for (const key of [
      "slug",
      "title",
      "description",
      "h1",
      "intro",
      "problem",
      "solution",
      "scenarios",
    ] as const) {
      if (!p[key]?.trim()) {
        throw new Error(`[growth] "${p.slug}": campo "${key}" vazio.`);
      }
    }
    if (!p.steps?.length) {
      throw new Error(`[growth] "${p.slug}": steps obrigatório.`);
    }
    if (isReservedSlug(p.slug)) {
      throw new Error(`[growth] slug reservado (rota do app): ${p.slug}`);
    }
    if (seoPageSlugs.includes(p.slug)) {
      throw new Error(`[growth] slug "${p.slug}" já existe em SEO programático.`);
    }
    if (seen.has(p.slug)) throw new Error(`[growth] slug duplicado: ${p.slug}`);
    seen.add(p.slug);
    bySlug.set(p.slug, p);
  }

  for (const p of pages) {
    if (p.related.length < 2) {
      throw new Error(`[growth] "${p.slug}": mínimo 2 related.`);
    }
    for (const r of p.related) {
      if (!bySlug.has(r)) {
        throw new Error(`[growth] "${p.slug}": related "${r}" inexistente.`);
      }
      if (r === p.slug) throw new Error(`[growth] "${p.slug}" não pode relacionar a si.`);
    }
  }
}

export const growthPages: GrowthPage[] = [
  {
    slug: "planilha-vs-app-financeiro",
    category: "comparative",
    title: "Planilha vs app financeiro: qual escolher em 2025 | DevFlow Labs",
    description:
      "Compare planilha Excel/Sheets, apps genéricos e o sistema DevFlow: automação, PF/PJ e casal num só lugar.",
    h1: "Planilha financeira vs aplicativo: o que faz sentido para você",
    intro:
      "Planilha é flexível, mas exige disciplina manual. App comum resolve o básico, mas raramente cobre PJ, casal e recorrência junto. A pergunta não é qual é “melhor” no abstract — é qual encaixa na sua operação real.",
    problem:
      "Quem só usa planilha gasta tempo copiando extrato, revisando fórmulas e perdendo histórico quando troca de arquivo. Quem usa app genérico muitas vezes trava em limite de categorias, não separa empresa de pessoal ou não divide bem com o parceiro.",
    solution:
      "O ideal é combinar registro rápido, visão mensal clara e separação de contextos (pessoal, negócio, dividido). Quando o sistema lembra recorrências e mostra orçamento vs real, você deixa de ser escravo da planilha sem perder o controle.",
    steps: [
      "Liste o que você precisa: só PF, PF+PJ ou ainda divisão com outra pessoa.",
      "Teste uma semana: anote tudo em planilha e note quantos minutos por dia gasta.",
      "Repita com um app: veja se exporta dados e se atende PJ se você tem CNPJ.",
      "Compare alertas de orçamento e recorrência — onde você erra menos?",
      "Escolha uma stack e feche o mês uma vez com método fixo.",
    ],
    tool: "financeiro",
    related: [
      "app-vs-excel-controle-financeiro",
      "melhor-forma-de-controlar-financas",
      "controle-financeiro-pessoal",
    ],
    showComparison: true,
    scenarios:
      "Freelancer que mistura PIX pessoal e da empresa no mesmo extrato; casal que desiste da planilha no terceiro mês; MEI que só olha o saldo do banco e toma susto com DAS e fornecedor.",
  },
  {
    slug: "melhor-forma-de-controlar-financas",
    category: "comparative",
    title: "Melhor forma de controlar finanças (sem complicar) | DevFlow Labs",
    description:
      "Hábito, ferramenta e revisão mensal: a combinação que funciona para quem já tentou planilha e desistiu.",
    h1: "Qual a melhor forma de controlar as finanças no dia a dia",
    intro:
      "A melhor forma é a que você consegue manter por mais de três meses. Isso quase sempre significa menos campos para preencher, lembrete do que é fixo e um ritual curto de fechamento — não um sistema perfeito que ninguém usa.",
    problem:
      "Muita gente monta planilha complexa, importa três meses de extrato de uma vez e abandona. Outros instalam cinco apps e não sabem onde está a verdade.",
    solution:
      "Três pilares: (1) uma fonte única de verdade, (2) recorrências automáticas para aluguel, assinaturas e parcelas, (3) 15 minutos no fim do mês para corrigir categoria e ver saldo.",
    steps: [
      "Defina só 8–12 categorias; menos é mais.",
      "Cadastre todas as despesas fixas com vencimento.",
      "Registre variáveis no ato (PIX, cartão) ou em bloco semanal.",
      "No último dia útil do mês, confira orçamento vs gasto.",
      "Ajuste um único número meta para o mês seguinte.",
    ],
    tool: "financeiro",
    related: [
      "planilha-vs-app-financeiro",
      "como-controlar-gastos-mensais",
      "controle-financeiro-pessoal",
    ],
    showComparison: true,
    scenarios:
      "Assalariado que quer saber quanto sobra após fixos; autônomo com receita irregular; família com filhos e várias assinaturas esquecidas.",
  },
  {
    slug: "app-vs-excel-controle-financeiro",
    category: "comparative",
    title: "App vs Excel para controle financeiro: prós e contras | DevFlow Labs",
    description:
      "Excel/Sheets contra aplicativos: curva de aprendizado, tempo, colaboração e limites para quem tem empresa.",
    h1: "App ou Excel para controle financeiro",
    intro:
      "Excel brilha em cenários únicos e projeções customizadas. App brilha em consistência, lembretes e visão pronta. Quem tem CNPJ costuma precisar dos dois mundos — ou de um sistema que una os benefícios.",
    problem:
      "Excel sem template maduro vira bagunça; app sem visão de caixa e de obrigações fiscais deixa o PJ cego. Alternar entre os dois sem integração duplica trabalho.",
    solution:
      "Use Excel para simulações pontuais e app (ou sistema) para operação diária e fechamento. O importante é não manter dois registros de ‘quanto tenho’ que divergem.",
    steps: [
      "Escreva em uma linha o que você precisa ver todo mês (saldo, fixos, PJ).",
      "Se Excel for obrigatório, crie uma aba só de lançamentos e gráficos em outra.",
      "Se for app, verifique exportação CSV e múltiplos contextos (PF/PJ).",
      "Evite digitar o mesmo lançamento em dois lugares — escolha um mestre.",
      "Revise uma vez por mês qual fonte está desatualizada.",
    ],
    tool: "financeiro",
    related: [
      "planilha-vs-app-financeiro",
      "como-controlar-financeiro-pj",
      "melhor-forma-de-controlar-financas",
    ],
    showComparison: true,
    scenarios:
      "Consultor que modela cenário no Excel mas quer app para wife ver gastos; lojista que precisa separar caixa da loja do pessoal.",
  },
  {
    slug: "como-organizar-financas",
    category: "problem_solution",
    title: "Como organizar suas finanças passo a passo | DevFlow Labs",
    description:
      "Do caos à clareza: separar contas, mapear fixos e criar um ritmo mensal que você aguenta.",
    h1: "Como organizar as finanças de verdade",
    intro:
      "Organizar finanças não é decorar app nem colorir planilha. É saber quanto entra, para onde vai o obrigatório e quanto sobra para variável e reserva — com um lugar só para olhar isso.",
    problem:
      "Cartão misturado com débito, dinheiro esquecido em carteiras digitais e ‘gasto invisível’ em assinaturas. Sem mapeamento de fixos, todo mês parece surpresa.",
    solution:
      "Primeiro consolidar vencimentos e valores fixos; segundo registrar variáveis por hábito (diário ou semanal); terceiro fechar o mês com um número de ‘sobra’ e meta mínima de reserva.",
    steps: [
      "Separe contas bancárias: idealmente uma para gastos do mês e reserva em outra.",
      "Liste aluguel, luz, internet, seguros, escola, assinaturas com valor e dia.",
      "Some receitas fixas e variáveis médias dos últimos 3 meses.",
      "Subtraia fixos da receita — o que resta é teto para variável + reserva.",
      "Use uma ferramenta que mostre isso em dashboard, não só em lista.",
    ],
    tool: "financeiro",
    related: [
      "como-controlar-gastos-mensais",
      "melhor-forma-de-controlar-financas",
      "controle-financeiro-pessoal",
    ],
    showComparison: false,
    scenarios:
      "Primeiro emprego com primeiro cartão; retorno ao Brasil com contas em dois bancos; quem nunca fechou um mês sem olhar só o extrato.",
  },
  {
    slug: "como-controlar-gastos-mensais",
    category: "problem_solution",
    title: "Como controlar gastos mensais sem virar refém da planilha | DevFlow Labs",
    description:
      "Método prático para saber para onde foi o dinheiro e cortar vazamento sem neurose.",
    h1: "Como controlar gastos mensais com método",
    intro:
      "Controle mensal bom mostra padrão, não julgamento. Se você só descobre o total no fim do mês, já é tarde para ajustar comportamento — por isso o ritmo de registro importa tanto quanto a ferramenta.",
    problem:
      "Extrato longo demais, parcelas espalhadas em vários cartões e gastos por PIX sem categoria. Planilha atualizada só no dia 31 não educa decisão.",
    solution:
      "Combine teto por categoria (alimentação, lazer) com conferência semanal de 10 minutos. Recorrências cadastradas uma vez reduzem 80% do trabalho manual.",
    steps: [
      "Defina teto mensal para as 3 categorias que mais pesam.",
      "No domingo, marque lançamentos da semana em um só lugar.",
      "Marque parcelas restantes de cada compra grande.",
      "Se estourar uma categoria, reduza a próxima semana, não o mês inteiro.",
      "No fechamento, copie aprendizado para meta do mês seguinte.",
    ],
    tool: "financeiro",
    related: [
      "como-organizar-financas",
      "como-organizar-financas-casal",
      "controle-financeiro-pessoal",
    ],
    showComparison: false,
    scenarios:
      "Quem estoura delivery todo mês; família com dois cartões de crédito; quem usa muito PIX e some no fim do mês.",
  },
  {
    slug: "como-organizar-financas-casal",
    category: "problem_solution",
    title: "Como organizar finanças a dois: casal sem briga | DevFlow Labs",
    description:
      "Conversas, contas conjuntas vs separadas e rateio justo — com ferramenta que ambos enxergam.",
    h1: "Como organizar finanças no casal",
    intro:
      "O problema raramente é matemática — é expectativa. Um acha que 50/50 é justo; outro ganha o dobro e se sente explorado. Clareza de regra + visão compartilhada evita 90% do atrito.",
    problem:
      "Um paga tudo e ressente; ou os dois gastam sem saber quanto sobrou para viagem; ou não há transparência sobre dívidas antigas.",
    solution:
      "Combinar modelo (caixa único, separado com rateio, ou híbrido), documentar em um sistema que os dois acessam, e revisar em data fixa — não só quando estoura.",
    steps: [
      "Conversar: metas comuns (casa, viagem) e dívidas individuais.",
      "Escolher modelo: rateio proporcional costuma funcionar com rendas diferentes.",
      "Listar despesas compartilhadas e quem paga o quê na prática.",
      "Migrar para uma visão única (app ou planilha compartilhada).",
      "Data fixa mensal de 20 min para alinhar — sem julgamento, só números.",
    ],
    tool: "financeiro",
    related: [
      "como-dividir-contas-sem-briga",
      "controle-financeiro-casal",
      "como-controlar-gastos-mensais",
    ],
    showComparison: false,
    scenarios:
      "Recém-casados unindo contas; um CLT e um autônomo; casal que mora junto mas mantém bancos separados.",
  },
  {
    slug: "como-controlar-financeiro-pj",
    category: "problem_solution",
    title: "Como controlar o financeiro da empresa (PJ/MEI) | DevFlow Labs",
    description:
      "Separar caixa pessoal do CNPJ, acompanhar obrigações e enxergar lucro real, não só faturamento.",
    h1: "Como controlar o financeiro da sua PJ",
    intro:
      "MEI e pequeno empresário confundem ‘entrou no Pix’ com lucro. Até pagar imposto, fornecedor e pró-labore, o que sobra pode ser outro número completamente diferente.",
    problem:
      "Um único banco para empresa e pessoal; esquecimento de DAS ou guias; não saber custo real por mês; misturar investimento pessoal com giro da empresa.",
    solution:
      "Contexto separado para PJ, lançamento de saídas recorrentes (aluguel sala, softwares) e visão de ‘quanto posso me pagar’ após reserva de imposto.",
    steps: [
      "Abra mentalidade: CNPJ é outra ‘pessoa’ financeira.",
      "Liste obrigações fixas da empresa com vencimento.",
      "Separe percentual ou valor fixo mensal para impostos antes de gastar lucro.",
      "Registre faturamento e despesa no mesmo sistema com tag PJ.",
      "Transfira pró-labore para PF só após reservas — não inverta a ordem.",
    ],
    tool: "financeiro",
    related: [
      "app-vs-excel-controle-financeiro",
      "controle-financeiro-empresa",
      "controle-financeiro-autonomo",
    ],
    showComparison: false,
    scenarios:
      "MEI que descobriu que DAS atrasou três meses; prestador com nota e recebimento fora de fase; pequena loja com estoque e caixa misturados.",
  },
  {
    slug: "como-dividir-contas-sem-briga",
    category: "problem_solution",
    title: "Como dividir contas sem briga (república ou casal) | DevFlow Labs",
    description:
      "Regras claras, rateio proporcional e ferramenta que calcula por você — sem planilha na madrugada.",
    h1: "Como dividir contas sem briga",
    intro:
      "Briga nasce de ambiguidade: ‘eu paguei o mercado mês passado’ sem registro. Quando o valor por pessoa sai de uma regra acordada (igual ou por renda), a discussão vira técnica, não emocional.",
    problem:
      "Alguém sempre paga na frente e esquece de cobrar; divisão 50/50 quando salários são muito diferentes; contas variáveis (luz) que ninguém sabe ratear.",
    solution:
      "Definir periodicamente (mensal) o que entra no rateio, usar proporcional à renda quando fizer sentido, e uma calculadora que gera o valor por cabeça em segundos.",
    steps: [
      "Liste moradores e renda bruta (ou combine divisão igual).",
      "Liste contas: fixas (aluguel) e variáveis (luz).",
      "Entre no rateio proporcional ou igual conforme combinado.",
      "Anote quem pagou o quê para acerto no fim do mês.",
      "Repita o ritual na mesma data — vira hábito, não debate.",
    ],
    tool: "divisao",
    related: [
      "como-organizar-financas-casal",
      "controle-financeiro-casal",
      "como-organizar-financas",
    ],
    showComparison: false,
    scenarios:
      "República com 4 pessoas; casal com um desempregado temporário; roommates com consumo muito diferente de energia.",
  },
  {
    slug: "controle-financeiro-pessoal",
    category: "use_case",
    title: "Controle financeiro pessoal: guia prático | DevFlow Labs",
    description:
      "Para quem quer clareza no salário, nas assinaturas e na reserva — sem complicar.",
    h1: "Controle financeiro pessoal que funciona",
    intro:
      "Pessoal é onde a maioria desiste: parece ‘pouco importante’ até o cartão estourar. Controle pessoal bom responde em dez segundos: quanto posso gastar esta semana após tudo que é obrigatório?",
    problem:
      "Muitas fontes de gasto (dois cartões, Pix, dinheiro) e uma só ‘cabeça’ tentando lembrar. Sem visão de fixos, o variável come todo o salário.",
    solution:
      "Um painel com fixos + variáveis + meta de reserva, atualizado com o mínimo de fricção. Fechamento mensal vira checkpoint, não obrigação diária chata.",
    steps: [
      "Cadastre receita e todos os fixos com vencimento.",
      "Defina percentual mínimo para reserva (mesmo que 5%).",
      "Categorize só o que importa para decisão (comida, transporte, lazer).",
      "Revise uma vez por semana; ajuste na hora.",
      "Feche o mês com número de sobra e celebre se bateu meta.",
    ],
    tool: "financeiro",
    related: [
      "como-organizar-financas",
      "como-controlar-gastos-mensais",
      "melhor-forma-de-controlar-financas",
    ],
    showComparison: false,
    scenarios:
      "CLT no primeiro emprego; profissional liberal com renda oscilante; quem quer juntar para viagem sem cortar tudo.",
  },
  {
    slug: "controle-financeiro-empresa",
    category: "use_case",
    title: "Controle financeiro para empresa pequena e MEI | DevFlow Labs",
    description:
      "Visão de caixa, separação do pessoal e orçamento do negócio em um fluxo só.",
    h1: "Controle financeiro para empresa",
    intro:
      "Empresa pequena morre de asfixia de caixa, não de falta de faturamento. Ter controle é saber quantos dias de fôlego existem se a receita atrasar uma semana.",
    problem:
      "Notas e Pix misturados; custo fixo subindo sem perceber; não saber margem real após impostos.",
    solution:
      "Tratar PJ com orçamento próprio: receitas esperadas, saídas obrigatórias, e colchão. Integrar mentalidade de ‘não misturar’ com ferramenta que suporte contexto BUSINESS.",
    steps: [
      "Mapeie ciclo de caixa médio (quanto demora cliente a pagar).",
      "Separe PJ em visão própria no sistema.",
      "Cadastre custos fixos da operação.",
      "Acompanhe faturamento vs meta semanalmente.",
      "Reserve impostos antes de distribuir lucro.",
    ],
    tool: "financeiro",
    related: [
      "como-controlar-financeiro-pj",
      "controle-financeiro-autonomo",
      "app-vs-excel-controle-financeiro",
    ],
    showComparison: false,
    scenarios:
      "MEI de serviço; pequena agência; comércio com fornecedor a prazo e cliente à vista.",
  },
  {
    slug: "controle-financeiro-casal",
    category: "use_case",
    title: "Controle financeiro para casal: visão única | DevFlow Labs",
    description:
      "Mesma base de dados, contexto compartilhado e metas alinhadas — com DevFlow Financeiro.",
    h1: "Controle financeiro para casal",
    intro:
      "Casal precisa de uma foto única: quanto a ‘casa’ custa e quanto sobra para cada um. Dois apps separados ou duas planilhas que não conversam geram a clássica pergunta ‘cadê o dinheiro?’.",
    problem:
      "Um controla, outro gasta sem ver saldo; ou ninguém controla porque ‘é chato’; metas (viagem, casa) ficam no vácuo.",
    solution:
      "Household compartilhado, categorias combinadas e visão de orçamento que os dois abrem no celular. Rateio e divisão de contas entram quando o modelo exige.",
    steps: [
      "Alinhem meta numérica para os próximos 12 meses.",
      "Unifiquem entrada de dados ou deleguem um e revisem juntos.",
      "Usem contexto SHARED ou equivalente para gastos da casa.",
      "Conectem ferramenta de divisão de contas para rateios pontuais.",
      "Revisão mensal curta em data fixa.",
    ],
    tool: "financeiro",
    related: [
      "como-organizar-financas-casal",
      "como-dividir-contas-sem-briga",
      "controle-financeiro-pessoal",
    ],
    showComparison: false,
    scenarios:
      "Casal que compra imóvel junto; um detalhista e um desapegado de números; família com filho e escola.",
  },
  {
    slug: "controle-financeiro-autonomo",
    category: "use_case",
    title: "Controle financeiro para autônomo e freelancer | DevFlow Labs",
    description:
      "Receita irregular, imposto, reserva e vida pessoal: como não misturar tudo no mesmo balde.",
    h1: "Controle financeiro para autônomo",
    intro:
      "Autônomo tem dois desafios: mês bom engana (parece que sobrou tudo) e mês ruim assusta. Separar ‘dinheiro da empresa’ e ‘pagamento para mim’ é o primeiro passo para sanidade.",
    problem:
      "PIX da empresa cai na conta pessoal; 13º do cliente vira viagem antes de guardar IR; não há provisão para mês seco.",
    solution:
      "Três potes mentais ou reais: operação, imposto/reserva legal, pró-labore. Sistema que aceita PF e PJ ajuda a não misturar.",
    steps: [
      "Calcule média dos últimos 6 meses de receita líquida.",
      "Defina % mínima para imposto e reserva antes de ‘sobra’.",
      "Pague-se valor fixo ou % estável, não ‘o que sobrou’.",
      "Registre PJ separado do PF.",
      "Revise trimestralmente se o pró-labore está realista.",
    ],
    tool: "financeiro",
    related: [
      "como-controlar-financeiro-pj",
      "controle-financeiro-empresa",
      "controle-financeiro-pessoal",
    ],
    showComparison: false,
    scenarios:
      "Designer com 10 clientes; personal trainer; consultor com nota e recebimento defasados.",
  },
];

assertGrowthPages(growthPages);

export const growthPageSlugs = growthPages.map((p) => p.slug);

export function getGrowthPageBySlug(slug: string): GrowthPage | undefined {
  return growthPages.find((p) => p.slug === slug);
}

export function getRelatedGrowthPages(slug: string): GrowthPage[] {
  const page = getGrowthPageBySlug(slug);
  if (!page) return [];
  return page.related
    .map((s) => getGrowthPageBySlug(s))
    .filter((p): p is GrowthPage => p !== undefined);
}
