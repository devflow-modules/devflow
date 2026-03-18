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
    title: "Planilha vs App Financeiro: Qual Escolher (Sem Complicar) | DevFlow Labs",
    description:
      "Comparativo direto: planilha, app comum e sistema completo. Veja o que faz sentido para você — PF, PJ e casal. Leitura rápida.",
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
    pillarSlug: "melhor-app-para-controlar-financas",
    faq: [
      { q: "Planilha ou app: qual é melhor para controle financeiro?", a: "Depende. Planilha é flexível e você controla tudo, mas exige disciplina. App dá lembretes e visão pronta, mas muitos não cobrem PJ e divisão com parceiro. O ideal é testar uma semana com cada um e ver onde você perde menos tempo e erra menos." },
      { q: "Preciso pagar por app de controle financeiro?", a: "Não necessariamente. Há ferramentas gratuitas como o Financeiro DevFlow que permitem organizar receitas, despesas e orçamento sem cartão. Para PF e casal, o gratuito costuma bastar." },
      { q: "Como escolher entre planilha e app se tenho PJ?", a: "Verifique se o app separa contexto pessoal e empresarial, permite recorrências (aluguel, DAS, assinaturas) e exporta dados. Se a planilha já atende mas consome tempo, um app que una PF e PJ pode valer a pena." },
    ],
  },
  {
    slug: "melhor-forma-de-controlar-financas",
    category: "comparative",
    title: "Melhor Forma de Controlar Finanças: Método Que Funciona | DevFlow Labs",
    description:
      "Hábito + ferramenta + revisão mensal. Para quem já tentou planilha e desistiu. Simples e prático.",
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
    faq: [
      { q: "Qual a melhor forma de controlar finanças pessoais?", a: "A que você mantém por mais de três meses: poucas categorias, recorrências cadastradas (aluguel, contas, parcelas) e um ritual de 15 minutos no fim do mês para conferir orçamento x realizado. Menos é mais." },
      { q: "Quantas categorias de despesa devo ter?", a: "Entre 8 e 12 costuma ser o ideal. Menos que isso você perde detalhe; mais que isso vira trabalho de classificar e muita gente desiste. Agrupe o que fizer sentido (ex.: alimentação + mercado)." },
      { q: "Preciso de aplicativo pago para controlar gastos?", a: "Não. Ferramentas gratuitas como o DevFlow permitem cadastrar receitas, despesas fixas e variáveis, e ver orçamento vs realizado. O importante é manter o hábito, não a ferramenta mais cara." },
    ],
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
    pillarSlug: "melhor-app-para-controlar-financas",
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
    pillarSlug: "como-organizar-financas-pessoais",
  },
  {
    slug: "como-controlar-gastos-mensais",
    category: "problem_solution",
    title: "Como Controlar Gastos Mensais: Método Prático (Sem Neurose) | DevFlow Labs",
    description:
      "Saiba para onde vai seu dinheiro e corte vazamento. Método em 5 passos. Grátis para testar.",
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
    pillarSlug: "controle-financeiro-completo",
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
    pillarSlug: "controle-financeiro-completo",
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

  // ========== PILARES (autoridade temática — 1500+ palavras) ==========

  {
    slug: "controle-financeiro-completo",
    category: "problem_solution",
    title: "Controle Financeiro Simples: Método Prático Para Organizar Seu Dinheiro | DevFlow Labs",
    description:
      "Receitas, despesas, orçamento e fechamento em um só lugar. Para PF, PJ e casal. Guia com exemplos reais e checklist — sem complicar.",
    h1: "Controle financeiro completo: guia prático para organizar seu dinheiro",
    intro:
      "Controle financeiro completo não é planilha infinita nem app com 50 categorias. É ter uma fonte única de verdade: quanto entra, quanto sai, o que é fixo e o que sobra no fim do mês. Este guia mostra o método que funciona para quem tem conta pessoal, CNPJ ou divide despesas com outra pessoa.",
    problem:
      "A maioria tenta controlar tudo de uma vez e desiste em poucas semanas. Planilha vira bagunça, app genérico não separa pessoa física e empresa, e ninguém sabe se aquele gasto entrou na categoria certa. Sem recorrências cadastradas (aluguel, contas, parcelas), o esforço manual consome tempo e o resultado fica desatualizado. Quem tem PJ mistura tudo no mesmo extrato e no fim do mês não sabe quanto é da empresa e quanto é pessoal.",
    solution:
      "O controle financeiro que funciona tem três pilares: (1) uma única fonte de verdade — um lugar onde todas as receitas e despesas entram; (2) recorrências cadastradas para tudo que se repete (aluguel, luz, internet, assinaturas, parcelas), assim o sistema já sugere e você só confirma ou ajusta; (3) um ritual de fechamento — 15 a 30 minutos no fim do mês para conferir categorias, ver orçamento x realizado e ajustar o próximo mês. Para quem tem PJ, o ideal é separar contextos: pessoal e empresa no mesmo sistema, mas com visões distintas, para não misturar dinheiro da loja com despesa de casa.",
    steps: [
      "Defina de 8 a 12 categorias de despesa; mais que isso vira trabalho e menos que isso perde detalhe.",
      "Cadastre todas as despesas fixas com data de vencimento (aluguel, contas, parcelas, assinaturas).",
      "Registre receitas e despesas variáveis no dia a dia ou em bloco semanal (evite acumular um mês de extrato).",
      "No último dia útil do mês, reserve 15–30 min: confira categorias, compare orçamento x realizado, ajuste o que passou do limite.",
      "Defina um único número meta para o mês seguinte (ex.: gastar no máximo X em alimentação) e revise as recorrências se algo mudou.",
      "Se tiver PJ: use um sistema que separe contexto pessoal e empresarial, ou ao menos tags, para nunca misturar caixa da empresa com despesa pessoal.",
    ],
    tool: "financeiro",
    related: [
      "planilha-vs-app-financeiro",
      "melhor-forma-de-controlar-financas",
      "como-controlar-gastos-mensais",
      "app-vs-excel-controle-financeiro",
      "controle-financeiro-pessoal",
    ],
    showComparison: true,
    scenarios:
      "Assalariado que quer saber quanto sobra após fixos; freelancer que mistura PIX pessoal e da empresa; casal que divide despesas e quer um número claro por mês; MEI que precisa ver DAS, fornecedores e lucro no mesmo lugar.",
    extraSections: [
      {
        title: "Comparação rápida: planilha x app x sistema completo",
        content:
          "Planilha: flexível e sua, mas exige disciplina para atualizar e não avisa vencimentos. App genérico: fácil de usar, mas muitos limitam categorias, não separam PF e PJ e não têm recorrências inteligentes. Sistema completo (como o Financeiro DevFlow): une receitas, despesas, orçamento, recorrências e suporta PF, PJ e casal no mesmo lugar, com fechamento mensal claro. A escolha depende de quanto tempo você quer gastar por semana e se precisa de mais de um contexto (pessoal + negócio).",
      },
      {
        title: "Exemplo prático: um mês de controle",
        content:
          "João tem salário de R$ 5.000 e aluguel de R$ 1.400, contas R$ 400, mercado R$ 800, transporte R$ 300. Cadastra as recorrências (aluguel todo dia 10, contas no dia 15). Define orçamento para mercado (R$ 900) e transporte (R$ 350). No dia a dia anota só o que varia: um jantar R$ 80, Uber R$ 25. No fim do mês vê: gastou R$ 850 em mercado (dentro) e R$ 320 em transporte (dentro). Sobrou R$ 1.200. No mês seguinte ajusta: quer guardar R$ 1.000, então o «resto» para gastos extras cai para R$ 200. Esse ritual de 20 minutos no último dia útil evita surpresas.",
      },
      {
        title: "Checklist: seu controle está completo?",
        content:
          "Você sabe quanto entra por mês (salário, freelance, outros)? Todas as despesas fixas estão cadastradas com vencimento? Você revisa pelo menos uma vez por mês (orçamento x realizado)? Se tem PJ, o dinheiro da empresa está separado do pessoal na sua visão? Você tem um número «meta» de quanto quer gastar ou guardar no mês? Se respondeu sim para a maioria, seu controle está no caminho certo.",
      },
    ],
    faq: [
      { q: "O que é controle financeiro completo?", a: "É ter visão clara de todas as receitas e despesas, com recorrências cadastradas (o que se repete todo mês) e um ritual de fechamento mensal para comparar orçamento x realizado. Inclui PF, e quando aplicável PJ e divisão com parceiro, num único método." },
      { q: "Preciso de planilha ou aplicativo?", a: "Depende do que você consegue manter. Planilha exige mais disciplina; app ou sistema que una recorrências, orçamento e fechamento costuma reduzir tempo e erros. O importante é uma única fonte de verdade e revisão mensal." },
      { q: "Como controlar finanças tendo PJ e conta pessoal?", a: "Use um sistema que permita contextos separados (pessoal e empresarial) ou ao menos categorias/tags bem definidas. Cadastre recorrências da empresa (DAS, aluguel do ponto, fornecedores) separado das despesas pessoais. Assim você vê lucro e caixa da empresa sem misturar com despesa de casa." },
      { q: "Quantas categorias de despesa devo usar?", a: "Entre 8 e 12 costuma ser o ideal. Menos que isso você perde detalhe; mais que isso vira trabalho de classificar e muitas pessoas desistem. Agrupe o que fizer sentido (ex.: alimentação + mercado)." },
      { q: "O controle financeiro do DevFlow é grátis?", a: "Sim. O Financeiro DevFlow permite cadastrar receitas, despesas, recorrências e ver orçamento x realizado sem pedir cartão. Você pode usar para PF, PJ e casal e fechar o mês com clareza." },
    ],
  },
  {
    slug: "como-organizar-financas-pessoais",
    category: "problem_solution",
    title: "Como Organizar Finanças Pessoais: Passo a Passo Que Funciona | DevFlow Labs",
    description:
      "Do caos à clareza em poucos passos. Receitas, despesas e ritual mensal. Guia prático com checklist — comece hoje.",
    h1: "Como organizar finanças pessoais: passo a passo que funciona",
    intro:
      "Organizar finanças pessoais não é sobre anotar cada centavo para sempre. É sobre ter clareza: quanto entra, quanto sai, o que é fixo e o que sobra. Com um método simples e um ritual curto no fim do mês, você para de ser surpreendido por contas e consegue guardar ou gastar com consciência.",
    problem:
      "Muita gente começa com planilha gigante ou vários apps e abandona em poucas semanas. Outros só olham o saldo do banco e não sabem para onde foi o dinheiro. Sem lista de despesas fixas (aluguel, contas, parcelas), fica difícil planejar. E sem um ritual de revisão, o orçamento vira intenção e nunca vira realidade.",
    solution:
      "O passo a passo que funciona: (1) Liste todas as receitas e despesas fixas do mês — aluguel, contas, financiamento, assinaturas. (2) Defina poucas categorias para o que varia (alimentação, transporte, lazer). (3) Cadastre recorrências no sistema ou planilha para não ter que digitar todo mês. (4) Registre gastos variáveis no ato ou em bloco semanal. (5) No fim do mês, reserve 15 minutos: confira se o que gastou bate com o que planejou e ajuste o próximo mês. A organização vem da consistência, não da ferramenta perfeita.",
    steps: [
      "Anote em um só lugar todas as receitas do mês (salário, extras, renda extra).",
      "Liste todas as despesas fixas com data de vencimento (aluguel, luz, água, internet, parcelas, assinaturas).",
      "Subtraia as fixas da receita: o que sobra é o «resto» para variáveis e economia.",
      "Defina um teto para 2–3 categorias variáveis (ex.: mercado R$ X, lazer R$ Y).",
      "Durante o mês, registre os gastos variáveis (ou em bloco uma vez por semana).",
      "No último dia útil, compare orçamento x realizado e ajuste o próximo mês.",
    ],
    tool: "financeiro",
    related: [
      "como-organizar-financas",
      "melhor-forma-de-controlar-financas",
      "como-controlar-gastos-mensais",
      "controle-financeiro-completo",
      "controle-financeiro-pessoal",
    ],
    showComparison: false,
    scenarios:
      "Quem recebe salário fixo e quer saber quanto pode gastar sem aperto; quem tem renda variável e precisa separar o que é fixo do que é extra; quem divide despesas com parceiro e quer um número claro por pessoa.",
    extraSections: [
      {
        title: "Erros que atrapalham a organização",
        content:
          "Não listar as despesas fixas (você acha que sabe, mas esquece assinatura ou parcela). Atualizar só uma vez por mês (acumula e vira trabalho chato). Ter muitas categorias (classificar vira pesadelo). Não ter um ritual de fechamento (orçamento vira wishful thinking). Misturar conta pessoal e da empresa sem separar (quem tem PJ perde o rumo).",
      },
      {
        title: "Exemplo: primeiro mês organizado",
        content:
          "Maria ganha R$ 4.000. Fixos: aluguel R$ 1.200, contas R$ 350, transporte R$ 200, plano R$ 80 = R$ 1.830. Sobram R$ 2.170. Ela define: mercado R$ 800, lazer R$ 300, guardar R$ 800. O resto (R$ 270) fica para imprevistos. Ela cadastra as recorrências num app e durante o mês anota mercado e lazer. No fim do mês vê que gastou R$ 850 em mercado (R$ 50 a mais) e R$ 250 em lazer. Ajusta: no próximo mês tenta fechar mercado em R$ 820 e mantém a meta de guardar R$ 800.",
      },
    ],
    faq: [
      { q: "Por onde começar a organizar minhas finanças?", a: "Liste receitas e todas as despesas fixas do mês. Subtraia as fixas da receita. O que sobra é o que você pode usar para variáveis e economia. Defina um teto para 2–3 categorias e anote os gastos durante o mês. No fim, compare e ajuste." },
      { q: "Preciso de aplicativo para organizar finanças?", a: "Não é obrigatório, mas facilita: recorrências lembram das contas, e você vê orçamento x realizado sem fazer conta na mão. Ferramentas como o Financeiro DevFlow são gratuitas e permitem fazer isso no navegador." },
      { q: "Quantas categorias de gastos devo ter?", a: "Entre 8 e 12 é um bom meio-termo. Menos perde detalhe; mais vira trabalho. Agrupe o que fizer sentido (ex.: alimentação + mercado, lazer + streaming)." },
      { q: "Como não desistir do controle financeiro?", a: "Escolha um método simples (poucas categorias, recorrências cadastradas) e um ritual curto (15–20 min no fim do mês). Consistência beats perfeição. Se acumular um mês de extrato, vira tarefa chata e as pessoas abandonam." },
      { q: "Como organizar finanças dividindo despesas com outra pessoa?", a: "Defina o que é compartilhado (aluguel, contas, mercado) e use rateio igual ou proporcional à renda. Uma ferramenta de divisão de contas mostra quanto cada um paga. Depois cada um controla o próprio resto no seu controle pessoal." },
    ],
  },
  {
    slug: "melhor-app-para-controlar-financas",
    category: "comparative",
    title: "Melhor App Para Controlar Finanças em 2025: Como Escolher (Grátis) | DevFlow Labs",
    description:
      "Comparativo direto: grátis, recorrências, PF e PJ. Saiba como escolher e teste sem cartão. Leitura rápida.",
    h1: "Melhor app para controlar finanças em 2025: como escolher",
    intro:
      "O «melhor» app de controle financeiro depende do que você precisa: só pessoa física, PF + PJ, divisão com parceiro, recorrências, orçamento mensal. Este guia compara o que importa na prática e mostra como testar sem compromisso — muitas opções são gratuitas e funcionam no navegador.",
    problem:
      "Há dezenas de apps de finanças: alguns são só planilhas bonitas, outros cobram caro por recursos básicos, outros não separam conta pessoal e empresa. Quem tem CNPJ precisa de recorrências (DAS, fornecedores) e visão de caixa; quem divide despesas com parceiro quer rateio claro. Escolher sem critério leva a instalar vários e não usar nenhum direito.",
    solution:
      "Antes de escolher, defina: você precisa só de PF ou também PJ? Quer dividir despesas com outra pessoa no mesmo sistema? Recorrências e lembretes são essenciais? O app exporta dados (CSV)? Com isso em mente, compare: (1) plano gratuito que inclua recorrências e orçamento; (2) suporte a mais de um contexto (pessoal/empresa); (3) facilidade de fechamento mensal (orçamento x realizado). Teste por uma semana anotando tudo no app; se virar rotina, vale manter.",
    steps: [
      "Liste o que você precisa: PF só, PF + PJ, ou ainda divisão com parceiro.",
      "Verifique se o app tem recorrências (despesas que se repetem) e alerta de vencimento.",
      "Veja se permite orçamento por categoria e fechamento mensal (quanto planejou x quanto gastou).",
      "Se tiver PJ: confira se separa contexto pessoal e empresarial.",
      "Teste por uma semana: cadastre receitas, fixos e variáveis e veja se o ritual faz sentido.",
      "Escolha um e mantenha por pelo menos 3 meses antes de trocar.",
    ],
    tool: "financeiro",
    related: [
      "planilha-vs-app-financeiro",
      "app-vs-excel-controle-financeiro",
      "melhor-forma-de-controlar-financas",
      "controle-financeiro-completo",
      "controle-financeiro-pessoal",
    ],
    showComparison: true,
    scenarios:
      "Assalariado que quer app grátis com recorrências; freelancer que precisa de PF e PJ no mesmo lugar; casal que quer rateio e visão compartilhada; MEI que precisa de DAS, fornecedores e lucro mensal.",
    extraSections: [
      {
        title: "O que um bom app de controle financeiro tem",
        content:
          "Recorrências para despesas fixas (aluguel, contas, parcelas) para não digitar todo mês. Orçamento por categoria e visão de «quanto planejei x quanto gastei». Suporte a múltiplos contextos (pessoal e empresarial) para quem tem PJ. Exportação de dados (CSV) para não ficar preso. Interface simples: se for difícil, você não vai manter. Opção gratuita que não limite categorias ou histórico de forma absurda.",
      },
      {
        title: "Planilha x app: quando cada um ganha",
        content:
          "Planilha ganha quando você quer total flexibilidade (fórmulas, cenários, modelos próprios) e não se importa em atualizar manualmente. App ganha quando você quer lembretes, recorrências e visão pronta de orçamento e fechamento. Para a maioria que já tentou planilha e desistiu, um app que una recorrências + orçamento + fechamento costuma funcionar melhor. Para quem tem PJ, um sistema que una PF e PJ no mesmo lugar evita duas planilhas e dois apps.",
      },
    ],
    faq: [
      { q: "Qual o melhor app de controle financeiro grátis?", a: "Depende do que você precisa. O ideal é que seja grátis sem limite baixo de categorias, tenha recorrências e orçamento. O Financeiro DevFlow atende isso: receitas, despesas, recorrências, orçamento e fechamento mensal, com suporte a PF, PJ e casal, sem pedir cartão." },
      { q: "App de controle financeiro precisa de cadastro com cartão?", a: "Não. Muitos apps permitem uso gratuito sem cartão. O Financeiro DevFlow é um deles: você pode organizar receitas, despesas e orçamento no navegador sem informar cartão." },
      { q: "Como escolher entre planilha e app?", a: "Se você já desistiu de planilha por falta de tempo ou organização, um app com recorrências e orçamento tende a funcionar melhor. Se você gosta de modelar tudo no Excel e não se importa em atualizar, planilha pode bastar. Teste uma semana com cada um e veja onde você mantém o hábito." },
      { q: "O app de controle financeiro funciona para PJ?", a: "Depende do app. O ideal é que permita separar contexto pessoal e empresarial (ou ao menos categorias/tags), cadastre recorrências da empresa (DAS, fornecedores) e mostre visão de caixa e resultado. O Financeiro DevFlow suporta PF, PJ e casal no mesmo sistema." },
      { q: "Posso testar o app antes de me comprometer?", a: "Sim. Ferramentas como o Financeiro DevFlow são gratuitas e não pedem cartão. Você cadastra receitas e despesas, usa recorrências e vê o fechamento. Se fizer sentido, mantém; se não, não há compromisso." },
    ],
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

export function getGrowthPagesByTool(
  tool: GrowthPage["tool"]
): GrowthPage[] {
  return growthPages.filter((p) => p.tool === tool);
}
